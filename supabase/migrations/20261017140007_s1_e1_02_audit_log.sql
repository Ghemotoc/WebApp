-- Migration: the append-only audit log (story S1-E1-02; architecture 1.6, piece B03).
--
-- What it adds: audit_log, where every staff action and every sensitive read is recorded, and
-- log_staff_action(), the only way to write to it.
-- Rule: "audit_log is append-only: no role, the owner included, can update or delete a row"
-- (architecture 1.6). Enforced three ways: no write policies, write privileges revoked from every
-- API role, and triggers that refuse UPDATE, DELETE and TRUNCATE even for the table's owner.
-- Who writes: admin_* functions in later stories (S1-E11) call log_staff_action() in the same
-- transaction as the change. Who reads: owner and admin (policy below; screen in S1-E11-01).

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The staff member who acted (rule 15: owner column user_id, not null, references profiles).
  user_id uuid not null references public.profiles (id),
  -- What happened, for example 'story.hide' or 'user.email_revealed'.
  action text not null,
  -- What it happened to: the table or area and the row's ID, as text so any key fits.
  target_type text not null,
  target_id text,
  -- The person the target belongs to, so staff can find every action about one account.
  target_user_id uuid references public.profiles (id),
  reason text,
  before_values jsonb,
  after_values jsonb,
  constraint audit_log_action_is_named check (btrim(action) <> ''),
  constraint audit_log_target_type_is_named check (btrim(target_type) <> '')
);

comment on table public.audit_log is
  'kind: staff
Append-only record of staff actions and sensitive reads; nobody can change or delete a row (1.6).';

create index audit_log_target_user_id_idx on public.audit_log (target_user_id);
create index audit_log_user_id_idx on public.audit_log (user_id);

/**
 * Trigger function: refuses every UPDATE, DELETE and TRUNCATE on audit_log.
 * Errors: always raises insufficient_privilege. Triggers fire for the table's owner too, which is
 * what makes the log append-only "for any role, the owner included" (architecture 1.6).
 */
create or replace function public.refuse_audit_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only: rows can never be changed or deleted (architecture 1.6).'
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function public.refuse_audit_log_change() is
  'Trigger: refuses any update, delete or truncate on audit_log, owner included (S1-E1-02).';

create trigger audit_log_refuse_update_or_delete
  before update or delete on public.audit_log
  for each row execute function public.refuse_audit_log_change();

create trigger audit_log_refuse_truncate
  before truncate on public.audit_log
  for each statement execute function public.refuse_audit_log_change();

-- No API role may change rows, and clients may not insert directly: only log_staff_action().
revoke update, delete, truncate on public.audit_log from anon, authenticated, service_role;
revoke insert on public.audit_log from anon, authenticated;
revoke execute on function public.refuse_audit_log_change() from public, anon, authenticated;

alter table public.audit_log enable row level security;

/**
 * Policy audit_log_select_admin: owner and admin read the audit log.
 * Why: the audit log is searchable and exportable by owner and admin only (architecture 1.8.3,
 * roles table: "Audit log: View and export" for owner and admin, "None" for everyone else).
 */
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy audit_log_select_admin on public.audit_log is
  'Allows owner and admin to read the audit log; nobody else (architecture 1.8.3).';

/**
 * log_staff_action: writes one audit row for the signed-in staff member.
 * Inputs: action_taken, target_table (what kind of thing), target_row_id, affected_user_id
 *   (whose thing it is), reason_given, values_before, values_after.
 * Returns: the new row's ID.
 * Errors: insufficient_privilege when the caller has no staff session; check_violation when the
 *   action or target is blank.
 * Where it fits: every admin_* function calls it in the same transaction as its change (B27).
 */
create or replace function public.log_staff_action(
  action_taken text,
  target_table text,
  target_row_id text default null,
  affected_user_id uuid default null,
  reason_given text default null,
  values_before jsonb default null,
  values_after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  -- Only a staff session may write to the audit log (architecture 1.8.1).
  if not public.is_staff_session() then
    raise exception 'Only staff can write to the audit log.' using errcode = 'insufficient_privilege';
  end if;

  -- Write the row as the signed-in staff member; the table's checks refuse blank fields.
  insert into public.audit_log (
    user_id, action, target_type, target_id, target_user_id, reason, before_values, after_values
  )
  values (
    (select auth.uid()), action_taken, target_table, target_row_id, affected_user_id,
    reason_given, values_before, values_after
  )
  returning id into new_row_id;

  return new_row_id;
end;
$$;

comment on function public.log_staff_action(text, text, text, uuid, text, jsonb, jsonb) is
  'Writes one audit row for the signed-in staff member; refuses non-staff (architecture 1.6, B03).';

revoke execute on function public.log_staff_action(text, text, text, uuid, text, jsonb, jsonb)
  from public, anon;
