/*
 * Migration: calls for submissions on the Writers' hub (bundle GAPS-12d; board WritersHub,
 * "Calls for submissions": a title, a line of details, when it closes and "Paid"). Part 4 of
 * GAPS-12.
 *
 * How it works: staff list calls from magazines, anthologies and competitions outside the
 * platform: a title and a line of details in Romanian and English, the organiser's own page, the
 * last day to send work and whether the work is paid. The hub lists the calls still open, soonest
 * closing first; each opens the organiser's page in a new tab.
 * What it adds:
 * - submission_calls: the calls (staff content, no personal data);
 * - writers_hub_calls(): the open calls for the signed-in writer;
 * - admin_save_submission_call() and admin_delete_submission_call(): staff with the contests
 *   area (owner and admin, architecture 1.8.3), each change in the audit log.
 * Who calls it: src/features/hub/ (the hub list and the staff page at /staff/hub).
 * Rules:
 * - Paid calls show only to adults. Paid writing work is for adults only (Robert, 8 Nov 2026,
 *   14:59 to 15:00, on commissioned writing); a paid call is the same kind of offer, so the same
 *   line is drawn here until a lawyer says otherwise.
 * - The link must be https. The platform handles no money and no submission: the writer deals
 *   with the organiser on the organiser's own page (CLAUDE.md rule 10).
 */

create table public.submission_calls (
  id uuid primary key default gen_random_uuid(),
  title_ro text not null,
  title_en text not null,
  -- One line: who is asking, for what and how long.
  details_ro text not null,
  details_en text not null,
  -- The organiser's own page about the call.
  link_url text not null,
  -- The last day to send work, in Romanian time, included.
  closes_on date not null,
  -- True when the organiser pays for the work they take.
  is_paid boolean not null default false,
  -- The staff member who last saved it.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting takes it off the hub; the audit log keeps what it said.
  deleted_at timestamptz,
  constraint submission_calls_title_ro_length check (char_length(btrim(title_ro)) between 1 and 120),
  constraint submission_calls_title_en_length check (char_length(btrim(title_en)) between 1 and 120),
  constraint submission_calls_details_ro_length check (char_length(btrim(details_ro)) between 1 and 300),
  constraint submission_calls_details_en_length check (char_length(btrim(details_en)) between 1 and 300),
  -- https only, no spaces or quotes, so the address can't carry a script or break out of a link.
  constraint submission_calls_link_is_https check (
    link_url ~ '^https://[^\s"''<>]+$' and char_length(link_url) between 12 and 500
  )
);

comment on table public.submission_calls is
  'kind: platform
Calls for submissions from outside the platform, listed on the Writers'' hub: staff-written title and details in Romanian and English, the organiser''s page, the last day and whether it pays (GAPS-12d). No personal data.';

create index submission_calls_open on public.submission_calls (closes_on) where deleted_at is null;

create trigger submission_calls_set_updated_at
  before update on public.submission_calls
  for each row execute function public.set_updated_at();
alter table public.submission_calls enable row level security;

/**
 * submission_calls_select_contest_staff: staff with the contests area read every call that isn't
 * deleted, closed ones included, for the staff page. Members never read the table: they get the
 * open calls that fit their age group through writers_hub_calls(). Writes go through the admin
 * functions.
 */
create policy submission_calls_select_contest_staff
  on public.submission_calls for select to authenticated
  using (deleted_at is null and (select public.staff_may('contests', 'view')));
comment on policy submission_calls_select_contest_staff on public.submission_calls is
  'Allows staff with the contests area to read the calls for submissions that aren''t deleted, closed ones included (GAPS-12d).';

grant select on public.submission_calls to authenticated;

/**
 * writers_hub_calls: the calls still open today, soonest closing first, for the hub.
 * Inputs: none. Returns: up to 12 rows: the call's ID, title and details in both languages, the
 *   organiser's page, the last day and whether it pays. A paid call shows only to an adult
 *   (age_band() = 18_plus). Nothing for a signed-out caller.
 * Flow: HubCalls → useHubCalls → api/hubCalls.ts → this function.
 */
create function public.writers_hub_calls()
returns table (
  call_id uuid,
  title_ro text,
  title_en text,
  details_ro text,
  details_en text,
  link_url text,
  closes_on date,
  is_paid boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    submission_calls.id,
    submission_calls.title_ro,
    submission_calls.title_en,
    submission_calls.details_ro,
    submission_calls.details_en,
    submission_calls.link_url,
    submission_calls.closes_on,
    submission_calls.is_paid
  from public.submission_calls
  where (select auth.uid()) is not null
    and submission_calls.deleted_at is null
    -- Still open: the last day is included.
    and submission_calls.closes_on >= public.romania_today()
    -- Paid writing work is for adults only (Robert, 8 Nov 2026).
    and (not submission_calls.is_paid or (select public.age_band()) = '18_plus')
  order by submission_calls.closes_on, submission_calls.created_at
  limit 12;
$$;

comment on function public.writers_hub_calls() is
  'The calls for submissions still open today, soonest closing first; paid ones only for adults (GAPS-12d).';
revoke all on function public.writers_hub_calls() from public, anon;
grant execute on function public.writers_hub_calls() to authenticated;

/**
 * admin_save_submission_call: adds a call for submissions, or changes one.
 * Inputs: call_id (null to add one) and call, a JSON object with title_ro, title_en (1 to 120
 *   characters), details_ro, details_en (1 to 300), link_url (https), closes_on (YYYY-MM-DD) and
 *   is_paid (true or false; false when left out).
 * Returns: the call's ID.
 * Errors: insufficient_privilege unless the caller may act on contests; check_violation for an
 *   empty or long text, a link that isn't https or a missing day; no_data_found for an unknown
 *   call.
 * Logged as submission_call.saved with the before and after values.
 */
create function public.admin_save_submission_call(call_id uuid, call jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.submission_calls;
  saved public.submission_calls;
begin
  -- Step 1: staff with the contests area only (the server decides, architecture 1.8.1).
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change calls for submissions.' using errcode = 'insufficient_privilege';
  end if;
  if call is null or nullif(call ->> 'closes_on', '') is null then
    raise exception 'A call needs its last day.' using errcode = 'check_violation';
  end if;
  -- Step 2: a new call, or the change to one that exists. The table's checks refuse bad values.
  if call_id is null then
    insert into public.submission_calls (title_ro, title_en, details_ro, details_en, link_url, closes_on,
      is_paid, updated_by_user_id)
    values (btrim(call ->> 'title_ro'), btrim(call ->> 'title_en'), btrim(call ->> 'details_ro'),
      btrim(call ->> 'details_en'), btrim(call ->> 'link_url'), (call ->> 'closes_on')::date,
      coalesce((call ->> 'is_paid')::boolean, false), (select auth.uid()))
    returning * into saved;
  else
    select * into before_row from public.submission_calls
    where submission_calls.id = call_id and deleted_at is null for update;
    if before_row.id is null then
      raise exception 'There is no such call for submissions.' using errcode = 'no_data_found';
    end if;
    update public.submission_calls set
      title_ro = btrim(call ->> 'title_ro'), title_en = btrim(call ->> 'title_en'),
      details_ro = btrim(call ->> 'details_ro'), details_en = btrim(call ->> 'details_en'),
      link_url = btrim(call ->> 'link_url'), closes_on = (call ->> 'closes_on')::date,
      is_paid = coalesce((call ->> 'is_paid')::boolean, false),
      updated_by_user_id = (select auth.uid())
    where id = call_id returning * into saved;
  end if;
  -- Step 3: the audit log keeps what changed, in the same transaction.
  perform public.log_staff_action('submission_call.saved', 'submission_calls', saved.id::text, null, null,
    case when before_row.id is null then null
         else to_jsonb(before_row) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at'] end,
    to_jsonb(saved) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at']);
  return saved.id;
end;
$$;

comment on function public.admin_save_submission_call(uuid, jsonb) is
  'Contest staff add or change a call for submissions; logged with before and after (GAPS-12d).';
revoke all on function public.admin_save_submission_call(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_submission_call(uuid, jsonb) to authenticated;

/**
 * admin_delete_submission_call: takes a call off the hub and the staff list; the audit log keeps
 * what it said.
 * Input: call_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on contests; no_data_found for an
 *   unknown call.
 */
create function public.admin_delete_submission_call(call_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.submission_calls;
begin
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change calls for submissions.' using errcode = 'insufficient_privilege';
  end if;
  update public.submission_calls set deleted_at = now(), updated_by_user_id = (select auth.uid())
  where id = call_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such call for submissions.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('submission_call.deleted', 'submission_calls', deleted.id::text, null, null,
    to_jsonb(deleted) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at'], null);
  return true;
end;
$$;

comment on function public.admin_delete_submission_call(uuid) is
  'Contest staff delete a call for submissions; logged (GAPS-12d).';
revoke all on function public.admin_delete_submission_call(uuid) from public, anon;
grant execute on function public.admin_delete_submission_call(uuid) to authenticated;
