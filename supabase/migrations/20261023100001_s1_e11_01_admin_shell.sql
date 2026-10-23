-- The admin shell's server side (story S1-E11-01; architecture 1.8.1, 1.8.2 and 1.8.3).
--
-- What it adds:
--   staff_session_hours, staff_fresh_sign_in_minutes   two settings (proposals, decided 23 Oct 2026)
--   is_staff_session()        now also refuses a staff session older than staff_session_hours
--   staff_signed_in_recently() true when the person signed in within staff_fresh_sign_in_minutes
--   require_role_change_allowed()  now also asks for that fresh sign-in (changing a role is one of
--                             the most sensitive actions, architecture 1.8.3)
--   my_staff_areas()          the areas the caller's roles allow: what the admin menu shows
--   log_sensitive_read()      one way to log the sensitive reads architecture 1.8.3 lists
--   admin_search_audit_log()  owner and admin search the log by action, staff member, target
--                             account and dates
--   admin_export_audit_log()  the same rows for a CSV file; the export itself is logged
-- Why no new table: the audit log from S1-E1-02 already refuses every update and delete for
-- every role, the owner included (its triggers fire for the table's owner too).
-- Why the server, not the menu: every staff screen reads and writes only through policies and
-- admin_* functions, and each of those asks staff_may(), which asks is_staff_session(). Hiding a
-- menu item is a convenience, never the protection (architecture 1.8.1).

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('staff_session_hours', '12'::jsonb, false,
   'Hours a staff session lasts before the person must sign in again (proposal, S1-E11-01).'),
  ('staff_fresh_sign_in_minutes', '15'::jsonb, false,
   'Minutes within which a staff member must have signed in to change a role (proposal, S1-E11-01).');

/* ---------- Session rules ---------- */

/**
 * staff_session_started_at: when the signed-in person's current session began.
 * Returns: the session's start from Supabase's own auth.sessions, found by the session_id claim
 *   of the token; null when the token carries no session_id. Every token Supabase Auth issues
 *   carries one; only the forged claims of database tests don't.
 * Internal: used by is_staff_session().
 */
create or replace function public.staff_session_started_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select sessions.created_at
  from auth.sessions
  where sessions.id::text = (select auth.jwt() ->> 'session_id');
$$;

comment on function public.staff_session_started_at() is
  'Internal: when the current session began, from auth.sessions; null without a session_id claim (S1-E11-01).';
revoke execute on function public.staff_session_started_at() from public, anon, authenticated;

/**
 * is_staff_session: true when this session may use staff powers.
 * March (S1-E2-07a): any staff-role session, now only while the session is younger than the
 *   setting staff_session_hours (12, a proposal; S1-E11-01). After that the person signs in again.
 * A token without a session_id claim (only the forged claims of database tests) has no start to
 *   measure, so it isn't time-limited; every real token has one.
 * After March, S1-E2-07b also requires a Google Workspace sign-in on STAFF_EMAIL_DOMAIN. Every
 *   staff rule reaches this function through staff_may(), so that is the one place to change.
 */
create or replace function public.is_staff_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff()
    and coalesce(
      public.staff_session_started_at()
        > now() - make_interval(hours => coalesce(public.setting_value('staff_session_hours'), '12')::text::integer),
      true
    );
$$;

comment on function public.is_staff_session() is
  'True when the session may use staff powers. March: any staff-role session younger than staff_session_hours (S1-E2-07a, S1-E11-01). S1-E2-07b makes it the Google Workspace sign-in check on STAFF_EMAIL_DOMAIN; every staff rule reaches it through staff_may().';

/**
 * staff_signed_in_recently: did the signed-in person sign in a few minutes ago?
 * Returns: true when the newest sign-in in the token's "amr" claim (Supabase lists each
 *   authentication method with its time) is within the setting staff_fresh_sign_in_minutes (15,
 *   a proposal). A refreshed token keeps the original sign-in time, so "recently" means a new
 *   sign-in, not a refresh.
 * Where it fits: the most sensitive staff actions ask for a fresh sign-in (architecture 1.8.3;
 *   decided 23 Oct 2026: changing a role in March; exports, "Emergency disable" and removing part
 *   of a writer's text when their stories land).
 */
create or replace function public.staff_signed_in_recently()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select max(to_timestamp((method ->> 'timestamp')::double precision))
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    ) > now() - make_interval(
      mins => coalesce(public.setting_value('staff_fresh_sign_in_minutes'), '15')::text::integer
    ),
    false
  );
$$;

comment on function public.staff_signed_in_recently() is
  'True when the person signed in within staff_fresh_sign_in_minutes, from the token''s amr claim (S1-E11-01).';
revoke execute on function public.staff_signed_in_recently() from public, anon;
grant execute on function public.staff_signed_in_recently() to authenticated;

/**
 * require_role_change_allowed: the checks every role or permission change shares (S1-E2-07a),
 *   now also asking for a fresh sign-in (S1-E11-01, decided 23 Oct 2026).
 * Inputs: target_user_id; reason_given. Returns: nothing.
 * Errors: insufficient_privilege unless the caller may manage roles in a staff session, or when
 *   the caller targets themselves; invalid_authorization_specification (28000) when the caller's
 *   sign-in is older than staff_fresh_sign_in_minutes, so the screen can say "sign in again";
 *   check_violation for a blank reason or an account that doesn't exist.
 */
create or replace function public.require_role_change_allowed(target_user_id uuid, reason_given text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('roles', 'act') then
    raise exception 'Only an owner or admin can change staff roles.' using errcode = 'insufficient_privilege';
  end if;
  if not public.staff_signed_in_recently() then
    raise exception 'Sign in again to change a staff role.'
      using errcode = 'invalid_authorization_specification';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Nobody can change their own role.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = target_user_id and profiles.deleted_at is null) then
    raise exception 'There is no such account.' using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.require_role_change_allowed(uuid, text) is
  'Internal: the shared checks before a staff role or permission changes, including a fresh sign-in (S1-E2-07a, S1-E11-01).';

/* ---------- The menu ---------- */

/**
 * my_staff_areas: which admin areas the signed-in person may use, and how.
 * Returns: one row per area: its name (as in staff_role_areas) and 'view' or 'act', the widest
 *   access any of the person's roles gives. Empty for a member, a visitor or a staff member whose
 *   session has ended. The admin menu is built from this (architecture 1.8.2); the server still
 *   checks every action.
 */
create or replace function public.my_staff_areas()
returns table (area text, access text)
language sql
stable
security definer
set search_path = ''
as $$
  select areas.area, max(areas.access)
  from public.staff_role_areas as areas
  where public.staff_may(areas.area, 'view')
  group by areas.area
  order by areas.area;
$$;

comment on function public.my_staff_areas() is
  'The admin areas the caller may use, for the admin menu; empty outside a staff session (S1-E11-01).';
revoke execute on function public.my_staff_areas() from public, anon;
grant execute on function public.my_staff_areas() to authenticated;

/* ---------- Sensitive reads ---------- */

/**
 * log_sensitive_read: records that a staff member looked at something sensitive.
 * Inputs: read_kind, one of the reads architecture 1.8.3 lists: email_revealed, draft_opened,
 *   export_file_opened, evidence_pack_opened, teacher_proof_opened; target_table and
 *   target_row_id (what was opened); affected_user_id (whose it is).
 * Returns: the audit row's ID.
 * Errors: check_violation for an unknown kind; insufficient_privilege outside a staff session
 *   (from log_staff_action()).
 * Where it fits: the screens of S1-E11-02 (Show email), S1-E11-08 (open a draft), S1-E11-09
 *   (open an export), S1-E10-10 (open an evidence pack) and S1-E2-11 (open a teacher's proof)
 *   call it before they show the thing.
 */
create or replace function public.log_sensitive_read(
  read_kind text,
  target_table text,
  target_row_id text default null,
  affected_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if read_kind not in ('email_revealed', 'draft_opened', 'export_file_opened',
                       'evidence_pack_opened', 'teacher_proof_opened') then
    raise exception 'Unknown sensitive read: %', read_kind using errcode = 'check_violation';
  end if;
  return public.log_staff_action(
    'sensitive_read.' || read_kind, target_table, target_row_id, affected_user_id
  );
end;
$$;

comment on function public.log_sensitive_read(text, text, text, uuid) is
  'Logs a sensitive read (email, draft, export, evidence pack, teacher proof) in the audit log (S1-E11-01).';
revoke execute on function public.log_sensitive_read(text, text, text, uuid) from public, anon;
grant execute on function public.log_sensitive_read(text, text, text, uuid) to authenticated;

/* ---------- Searching and exporting the log ---------- */

-- Searching by date and action is what the page does most.
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_action_idx on public.audit_log (action);

/** audit_log_row: one row of the audit log as the screens see it (usernames, a short target ID). */
create type public.audit_log_row as (
  id uuid,
  created_at timestamptz,
  staff_handle text,
  action text,
  target_type text,
  target_id text,
  target_handle text,
  target_user_id_short text,
  reason text,
  before_values jsonb,
  after_values jsonb
);

comment on type public.audit_log_row is
  'One audit log row as the Audit log screen and the CSV export see it (S1-E11-01).';

/**
 * audit_log_rows: the shared query behind the search and the export.
 * Inputs: action_prefix (null for every action; 'staff.' matches every staff action),
 *   staff_handle (the person who acted, null for anyone), target_user_id (whose thing it was,
 *   null for any), from_date and to_date (inclusive, null for no limit), row_limit, row_offset.
 * Returns: the newest rows first, with usernames instead of raw IDs where a username exists.
 *   The target account's ID is shortened to its first 8 characters: staff see the ID short with a
 *   copy button, never in full on a list (architecture 1.6).
 * Internal: admin_search_audit_log() and admin_export_audit_log() check the role, then call it.
 */
create or replace function public.audit_log_rows(
  action_prefix text,
  staff_handle text,
  target_user_id uuid,
  from_date date,
  to_date date,
  row_limit integer,
  row_offset integer
)
returns setof public.audit_log_row
language sql
stable
security definer
set search_path = ''
as $$
  select
    log.id,
    log.created_at,
    actor.handle,
    log.action,
    log.target_type,
    log.target_id,
    target.handle,
    left(log.target_user_id::text, 8),
    log.reason,
    log.before_values,
    log.after_values
  from public.audit_log as log
  join public.profiles as actor on actor.id = log.user_id
  left join public.profiles as target on target.id = log.target_user_id
  where (action_prefix is null or log.action like action_prefix || '%')
    and (staff_handle is null
         or actor.handle_skeleton = public.username_skeleton(btrim(staff_handle, ' @')))
    and (target_user_id is null or log.target_user_id = target_user_id)
    and (from_date is null or log.created_at >= from_date::timestamptz)
    and (to_date is null or log.created_at < (to_date + 1)::timestamptz)
  order by log.created_at desc, log.id desc
  limit row_limit offset row_offset;
$$;

comment on function public.audit_log_rows(text, text, uuid, date, date, integer, integer) is
  'Internal: the audit log search, newest first, with usernames instead of IDs (S1-E11-01).';
revoke execute on function public.audit_log_rows(text, text, uuid, date, date, integer, integer)
  from public, anon, authenticated;

/**
 * admin_search_audit_log: one page of the audit log, for the Audit log screen.
 * Inputs: as audit_log_rows(), with page_size (at most 100) and page_number (from 1).
 * Returns: that page, newest first. Errors: insufficient_privilege unless the caller may view the
 *   audit log (owner and admin, architecture 1.8.3).
 * Where it fits: /staff/audit-log → useAuditLog → api/auditLog.ts → here.
 */
create or replace function public.admin_search_audit_log(
  action_prefix text default null,
  staff_handle text default null,
  target_user_id uuid default null,
  from_date date default null,
  to_date date default null,
  page_size integer default 50,
  page_number integer default 1
)
returns setof public.audit_log_row
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('audit_log', 'view') then
    raise exception 'Only an owner or admin can read the audit log.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select * from public.audit_log_rows(
      action_prefix, staff_handle, target_user_id, from_date, to_date,
      least(greatest(page_size, 1), 100), (greatest(page_number, 1) - 1) * least(greatest(page_size, 1), 100)
    );
end;
$$;

comment on function public.admin_search_audit_log(text, text, uuid, date, date, integer, integer) is
  'One page of the audit log for owner and admin, newest first (S1-E11-01).';

/**
 * admin_export_audit_log: the rows for a CSV file of the audit log.
 * Inputs: the same filters as admin_search_audit_log(). Returns: at most 10,000 rows, newest
 *   first; the screen turns them into the file. Before returning, it writes one audit row,
 *   audit_log.exported, holding the filters used: an export is a sensitive read of other
 *   people's data (architecture 1.8.3, "sensitive reads are logged as well as changes").
 * Errors: insufficient_privilege unless the caller may export (owner and admin).
 */
create or replace function public.admin_export_audit_log(
  action_prefix text default null,
  staff_handle text default null,
  target_user_id uuid default null,
  from_date date default null,
  to_date date default null
)
returns setof public.audit_log_row
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('audit_log', 'act') then
    raise exception 'Only an owner or admin can export the audit log.' using errcode = 'insufficient_privilege';
  end if;
  perform public.log_staff_action(
    'audit_log.exported', 'audit_log', null, null, null, null,
    jsonb_build_object(
      'action_prefix', action_prefix, 'staff_handle', staff_handle,
      'target_user_id', target_user_id, 'from_date', from_date, 'to_date', to_date
    )
  );
  return query
    select * from public.audit_log_rows(
      action_prefix, staff_handle, target_user_id, from_date, to_date, 10000, 0
    );
end;
$$;

comment on function public.admin_export_audit_log(text, text, uuid, date, date) is
  'The audit log rows for a CSV export, logged as audit_log.exported (owner and admin; S1-E11-01).';

revoke execute on function public.admin_search_audit_log(text, text, uuid, date, date, integer, integer)
  from public, anon;
revoke execute on function public.admin_export_audit_log(text, text, uuid, date, date) from public, anon;
grant execute on function public.admin_search_audit_log(text, text, uuid, date, date, integer, integer)
  to authenticated;
grant execute on function public.admin_export_audit_log(text, text, uuid, date, date) to authenticated;
