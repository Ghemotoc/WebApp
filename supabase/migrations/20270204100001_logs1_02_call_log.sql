-- Migration: the call log, one row for every call the app makes to the back end (bundle LOGS-1,
-- part c).
--
-- Asked for by Robert, 6 Nov 2026, 06:48 UTC: "a log where we can see every call that's been
-- made, where it failed, and so on, in case we ever need to track anything".
-- Decided by Robert, 6 Nov 2026, 06:53 UTC (decision card): the log stores the user ID on every
-- call and keeps rows for 30 days.
--
-- What it adds:
--   call_log                  one row per call the browser made: what kind of call, its name
--                             (an RPC, a table, an Auth step, an edge function), the outcome, the
--                             status and error code, how long it took, the page's route pattern,
--                             the app version and who made it (the user ID, empty for visitors).
--                             Never what was sent or what came back, never an email, an IP
--                             address or anything someone wrote (CLAUDE.md rule 12).
--   log_calls(entries)        the only way in, for anyone (signed out included): the browser sends
--                             its calls in batches; each entry is checked and the user ID comes
--                             from the sign-in, never from the batch
--   admin_list_calls()        one page of calls, newest first, with filters, for owner and admin
--   admin_call_failures()     failed calls grouped by what failed and how, for owner and admin
--   purge_old_call_log()      deletes rows older than call_log_keep_days (30), nightly
--
-- Who calls it: the browser's call recorder (src/features/errors/lib/callRecorder.ts, installed
-- in src/lib/supabase.ts) and Staff › Logs (src/features/staff/components/logs/).
-- Rules it follows:
--   - CLAUDE.md rule 1: RLS on; one select policy for owner and admin; rows arrive only through
--     log_calls() and leave only through the purge, so no write privilege is granted.
--   - Rule 12 and GDPR art. 5(1)(c): no request or response bodies, no query strings, no IDs in
--     names (the browser and this file both replace them), no IP address.
--   - Kind platform, not user_action: the log is about the app working, and a visitor's calls have
--     no user ID, so user_id is nullable here (test 002 only asks user tables for a not-null one).
--   - Architecture 1.8.3: sensitive reads are logged too; looking at one person's calls writes an
--     audit row.

/* ---------- Settings ---------- */

-- Proposals; staff change them in Settings (S1-E11-03) without a release.
insert into public.settings (key, value, is_public, description) values
  ('call_log_keep_days', '30'::jsonb, false,
   'Days a row of the call log is kept before the nightly purge deletes it (LOGS-1; Robert, 6 Nov 2026).'),
  ('call_log_per_minute_member', '600'::jsonb, false,
   'Most call log rows stored per minute for one signed-in account; more are dropped (LOGS-1).'),
  ('call_log_per_minute_visitors', '3000'::jsonb, false,
   'Most call log rows stored per minute for all visitors together; more are dropped (LOGS-1).')
on conflict (key) do nothing;

/* ---------- Table ---------- */

create table public.call_log (
  id uuid primary key default gen_random_uuid(),
  -- Who made the call: the signed-in account, or empty for a visitor (Robert, 6 Nov 2026).
  -- "set null" so the log never stands in the way of the account deletion job (S1-E13-03).
  user_id uuid references public.profiles (id) on delete set null,
  -- What kind of call: an RPC, a table read or write, an Auth step, an edge function, a Storage
  -- call, or one of our own /api addresses.
  call_kind text not null,
  -- Which one: the RPC's or table's name, the Auth step ("token", "user"), the function's name or
  -- the /api path with IDs replaced by ":id".
  call_name text not null,
  -- GET, POST, PATCH, PUT, DELETE or HEAD.
  http_method text not null,
  -- ok, client_error (4xx), server_error (5xx) or network_error (no answer).
  outcome text not null,
  -- The HTTP status, 0 when there was no answer.
  status_code integer not null,
  -- The error's code when the call failed, for example "42501", "PGRST116" or
  -- "invalid_credentials"; never its message, which can quote what someone typed.
  error_code text,
  -- How long the call took, in milliseconds.
  duration_ms integer not null,
  -- The page's route pattern, for example "/s/:storySlug"; never the address itself.
  route_path text not null,
  -- Which build of the app made the call.
  app_version text not null,
  -- When the browser made the call (within the last day; the server's clock otherwise).
  called_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_log_kind_is_known check (
    call_kind in ('rpc', 'table', 'auth', 'function', 'storage', 'api')
  ),
  constraint call_log_name_shape check (call_name ~ '^[A-Za-z0-9_.:/-]{1,100}$'),
  constraint call_log_method_is_known check (
    http_method in ('GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD')
  ),
  constraint call_log_outcome_is_known check (
    outcome in ('ok', 'client_error', 'server_error', 'network_error')
  ),
  constraint call_log_status_range check (status_code between 0 and 599),
  constraint call_log_error_code_shape check (error_code is null or error_code ~ '^[A-Za-z0-9_.-]{1,40}$'),
  constraint call_log_duration_range check (duration_ms between 0 and 600000),
  constraint call_log_route_is_a_path check (route_path ~ '^/[^?#]*$' and char_length(route_path) <= 200),
  constraint call_log_version_shape check (app_version ~ '^[A-Za-z0-9._+-]{1,40}$')
);

comment on table public.call_log is
  'kind: platform
Every call the app made to the back end: kind, name, outcome, status, error code, duration, route pattern, app version and the user ID (empty for visitors); no bodies, emails, IPs or user text; kept 30 days (LOGS-1).';

-- The screens read newest first and by person; the purge and the rate limits read by time.
create index call_log_called_at_idx on public.call_log (called_at desc);
create index call_log_created_at_idx on public.call_log (created_at);
create index call_log_user_id_idx on public.call_log (user_id, called_at desc);
-- Failures are a small share of all calls, so they get their own partial index.
create index call_log_failures_idx on public.call_log (called_at desc) where outcome <> 'ok';

create trigger call_log_set_updated_at
  before update on public.call_log
  for each row execute function public.set_updated_at();

alter table public.call_log enable row level security;

/* ---------- Who may read ---------- */

-- A new staff area, owner and admin only (Robert, 6 Nov 2026: "kept 30 days, owner and admin").
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('call_log', 'owner', 'view', null),
  ('call_log', 'admin', 'view', null)
on conflict do nothing;

/**
 * Policy call_log_select_admin: owner and admin, in a staff session, read the call log.
 * Why: to see where the app fails and to trace a problem someone reported. The log shows who
 * made each call, so nobody else may read it; members and visitors only ever write, through
 * log_calls().
 */
create policy call_log_select_admin
  on public.call_log
  for select
  to authenticated
  using ((select public.staff_may('call_log', 'view')));

comment on policy call_log_select_admin on public.call_log is
  'Allows owner and admin, in a staff session, to read the call log (LOGS-1).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions).
revoke all on public.call_log from anon, authenticated;
grant select on public.call_log to authenticated;  -- call_log_select_admin

/* ---------- Writing ---------- */

/**
 * call_log_entry_is_valid: whether one entry from the browser fits the table.
 * Input: one JSON object with kind, name, method, status, error_code, duration_ms, route,
 *   version and called_at. Returns: true when every field has the right shape.
 * Why a separate check: log_calls() skips a bad entry instead of failing the whole batch.
 */
create or replace function public.call_log_entry_is_valid(entry jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(entry) = 'object'
    and coalesce(entry ->> 'kind', '') in ('rpc', 'table', 'auth', 'function', 'storage', 'api')
    and coalesce(entry ->> 'name', '') ~ '^[A-Za-z0-9_.:/-]{1,100}$'
    and coalesce(entry ->> 'method', '') in ('GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD')
    and coalesce(entry ->> 'status', '') ~ '^[0-9]{1,3}$'
    and (entry ->> 'status')::integer <= 599
    and (entry ->> 'error_code' is null or entry ->> 'error_code' ~ '^[A-Za-z0-9_.-]{1,40}$')
    and coalesce(entry ->> 'duration_ms', '') ~ '^[0-9]{1,6}$'
    and (entry ->> 'duration_ms')::integer <= 600000;
$$;

comment on function public.call_log_entry_is_valid(jsonb) is
  'Whether one call log entry from the browser has the right shape (LOGS-1).';

/**
 * call_log_outcome_of: the outcome a status means.
 * Input: the HTTP status (0 when there was no answer). Returns: ok, client_error, server_error
 *   or network_error. Worked out here, so a browser can't call a failure a success.
 */
create or replace function public.call_log_outcome_of(status_code integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when status_code = 0 then 'network_error'
    when status_code >= 500 then 'server_error'
    when status_code >= 400 then 'client_error'
    else 'ok'
  end;
$$;

comment on function public.call_log_outcome_of(integer) is
  'The call log outcome for an HTTP status: ok, client_error, server_error or network_error (LOGS-1).';

/**
 * call_log_room_left: how many more rows the caller may store this minute.
 * Input: the caller's user ID, or null for a visitor. Returns: the room left, never below 0.
 * Why: a signed-in account is limited on its own; visitors have no ID or IP address to tell apart,
 *   so they share one limit (the same approach as report_client_error(), S1-E1-05).
 */
create or replace function public.call_log_room_left(caller_id uuid)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  allowed integer;
  used integer;
begin
  if caller_id is null then
    allowed := coalesce((public.setting_value('call_log_per_minute_visitors'))::integer, 3000);
    select count(*) into used from public.call_log as calls
    where calls.user_id is null and calls.created_at > now() - interval '1 minute';
  else
    allowed := coalesce((public.setting_value('call_log_per_minute_member'))::integer, 600);
    select count(*) into used from public.call_log as calls
    where calls.user_id = caller_id and calls.created_at > now() - interval '1 minute';
  end if;
  return greatest(allowed - used, 0);
end;
$$;

comment on function public.call_log_room_left(uuid) is
  'How many more call log rows the caller (or all visitors together) may store this minute (LOGS-1).';

/**
 * log_calls: stores a batch of calls the browser made.
 * Input: entries, a JSON array of at most 50 objects {kind, name, method, status, error_code,
 *   duration_ms, route, version, called_at}. A bad entry is skipped, not an error, so one odd
 *   call never loses the rest.
 * Returns: how many rows were stored (fewer than sent when entries were bad or the limit was hit).
 * Where it fits: anyone may call it, signed out included; src/features/errors/api/callLog.ts sends
 *   the batches. The user ID is the caller's own sign-in, never a value from the batch, so nobody
 *   can write calls in someone else's name.
 */
create or replace function public.log_calls(entries jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  room_left integer;
  stored_rows integer;
begin
  -- Step 1: only an array, at most 50 entries a batch.
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) > 50 then
    raise exception 'Send at most 50 calls at a time, as a list.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: over the per-minute limit, store nothing more (the browser doesn't retry).
  room_left := public.call_log_room_left(caller_id);
  if room_left = 0 then
    return 0;
  end if;
  -- Step 3: store the valid entries, cleaned again: route and version as in the error log
  -- (S1-E1-05), the outcome from the status, and the time kept only when it is plausible.
  insert into public.call_log (user_id, call_kind, call_name, http_method, outcome, status_code,
    error_code, duration_ms, route_path, app_version, called_at)
  select caller_id, entry ->> 'kind', entry ->> 'name', entry ->> 'method',
    public.call_log_outcome_of((entry ->> 'status')::integer), (entry ->> 'status')::integer,
    entry ->> 'error_code', (entry ->> 'duration_ms')::integer,
    public.scrub_route_path(entry ->> 'route'),
    case when entry ->> 'version' ~ '^[A-Za-z0-9._+-]{1,40}$' then entry ->> 'version' else 'unknown' end,
    public.call_log_time_of(entry ->> 'called_at')
  from jsonb_array_elements(entries) as entry
  where public.call_log_entry_is_valid(entry)
  limit room_left;
  get diagnostics stored_rows = row_count;
  return stored_rows;
end;
$$;

comment on function public.log_calls(jsonb) is
  'Stores a batch of up to 50 calls the browser made, under the caller''s own user ID (LOGS-1).';

/**
 * call_log_time_of: when a call happened, as the browser said, if that is believable.
 * Input: an ISO time as text. Returns: that time when it is within the last day and not in the
 *   future (a minute of clock drift allowed), otherwise now().
 */
create or replace function public.call_log_time_of(raw_time text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  parsed timestamptz;
begin
  begin
    parsed := raw_time::timestamptz;
  exception when others then
    return now();
  end;
  if parsed is null or parsed > now() + interval '1 minute' or parsed < now() - interval '1 day' then
    return now();
  end if;
  return parsed;
end;
$$;

comment on function public.call_log_time_of(text) is
  'The browser''s time for a call when it is within the last day and not in the future, otherwise now (LOGS-1).';

/* ---------- Reading ---------- */

/**
 * admin_list_calls: one page of the call log, newest first, for owner and admin.
 * Inputs: since (default the last 24 hours); only_failures (default false); kind (one call_kind,
 *   or null for all); name_contains (part of the call's name, or null); person_handle (one
 *   account's handle, or null for everyone); before (the called_at of the last row of the
 *   previous page, or null for the first page); max_rows (default 100, at most 500).
 * Returns: one row per call, with the account's handle (null for a visitor) and its user ID.
 * Errors: insufficient_privilege unless the caller may view the call log in a staff session;
 *   no_data_found when person_handle names no account.
 * Audit: filtering by one person is a sensitive read (architecture 1.8.3), so it writes an audit
 *   row, once per call of this function.
 * Where it fits: Staff › Logs › Calls (src/features/staff/components/logs/CallsTab.tsx).
 */
create or replace function public.admin_list_calls(
  since timestamptz default now() - interval '24 hours',
  only_failures boolean default false,
  kind text default null,
  name_contains text default null,
  person_handle text default null,
  before timestamptz default null,
  max_rows integer default 100
)
returns table (
  id uuid,
  called_at timestamptz,
  user_id uuid,
  handle text,
  call_kind text,
  call_name text,
  http_method text,
  outcome text,
  status_code integer,
  error_code text,
  duration_ms integer,
  route_path text,
  app_version text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  person_id uuid;
begin
  -- Step 1: owner and admin only, in a staff session.
  if not public.staff_may('call_log', 'view') then
    raise exception 'Only an owner or admin can read the call log.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: one person's calls: find the account and write the audit row.
  if nullif(btrim(person_handle), '') is not null then
    select profiles.id into person_id from public.profiles
    where lower(profiles.handle) = lower(btrim(ltrim(person_handle, '@')));
    if person_id is null then
      raise exception 'There is no account with that username.' using errcode = 'no_data_found';
    end if;
    perform public.log_staff_action('call_log.viewed_for_account', 'call_log', null, person_id,
      null, null, null);
  end if;
  -- Step 3: the page of rows.
  return query
    select calls.id, calls.called_at, calls.user_id, profiles.handle, calls.call_kind,
      calls.call_name, calls.http_method, calls.outcome, calls.status_code, calls.error_code,
      calls.duration_ms, calls.route_path, calls.app_version
    from public.call_log as calls
    left join public.profiles on profiles.id = calls.user_id
    where calls.called_at >= admin_list_calls.since
      and (admin_list_calls.before is null or calls.called_at < admin_list_calls.before)
      and (not coalesce(only_failures, false) or calls.outcome <> 'ok')
      and (admin_list_calls.kind is null or calls.call_kind = admin_list_calls.kind)
      and (nullif(btrim(name_contains), '') is null
           or calls.call_name ilike '%' || btrim(name_contains) || '%')
      and (person_id is null or calls.user_id = person_id)
    order by calls.called_at desc
    limit least(greatest(coalesce(max_rows, 100), 1), 500);
end;
$$;

comment on function public.admin_list_calls(timestamptz, boolean, text, text, text, timestamptz, integer) is
  'One page of the call log, newest first, with filters, for owner and admin; one person''s calls are audited (LOGS-1).';

/**
 * admin_call_failures: failed calls grouped by what failed and how, for owner and admin.
 * Input: since (default the last 7 days).
 * Returns: one row per call kind, name, status and error code that failed, with how many times,
 *   how many different accounts hit it, and when it first and last happened; most failures first.
 * Errors: insufficient_privilege unless the caller may view the call log in a staff session.
 * Where it fits: Staff › Logs › Failures (src/features/staff/components/logs/FailuresTab.tsx).
 */
create or replace function public.admin_call_failures(
  since timestamptz default now() - interval '7 days'
)
returns table (
  call_kind text,
  call_name text,
  status_code integer,
  error_code text,
  failures integer,
  accounts integer,
  first_seen timestamptz,
  last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('call_log', 'view') then
    raise exception 'Only an owner or admin can read the call log.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select calls.call_kind, calls.call_name, calls.status_code, calls.error_code,
      count(*)::integer, count(distinct calls.user_id)::integer,
      min(calls.called_at), max(calls.called_at)
    from public.call_log as calls
    where calls.outcome <> 'ok' and calls.called_at >= admin_call_failures.since
    group by calls.call_kind, calls.call_name, calls.status_code, calls.error_code
    order by count(*) desc, max(calls.called_at) desc
    limit 200;
end;
$$;

comment on function public.admin_call_failures(timestamptz) is
  'Failed calls grouped by kind, name, status and error code, for owner and admin (LOGS-1).';

/* ---------- Retention ---------- */

/**
 * purge_old_call_log: deletes call log rows older than call_log_keep_days (30).
 * Returns: how many rows it deleted. Where it fits: pg_cron runs it every night (below); tests call
 *   it directly. Nobody else may run it.
 */
create or replace function public.purge_old_call_log()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  keep_days integer := coalesce((public.setting_value('call_log_keep_days'))::integer, 30);
  deleted_rows integer;
begin
  delete from public.call_log as calls
  where calls.created_at < now() - make_interval(days => keep_days);
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

comment on function public.purge_old_call_log() is
  'Deletes call log rows older than call_log_keep_days (30); run nightly by pg_cron (LOGS-1).';

/* ---------- Function privileges ---------- */

revoke execute on function public.call_log_entry_is_valid(jsonb) from public, anon, authenticated;
revoke execute on function public.call_log_outcome_of(integer) from public, anon, authenticated;
revoke execute on function public.call_log_room_left(uuid) from public, anon, authenticated;
revoke execute on function public.call_log_time_of(text) from public, anon, authenticated;
revoke execute on function public.log_calls(jsonb) from public;
revoke execute on function public.admin_list_calls(timestamptz, boolean, text, text, text, timestamptz, integer) from public, anon;
revoke execute on function public.admin_call_failures(timestamptz) from public, anon;
revoke execute on function public.purge_old_call_log() from public, anon, authenticated;
grant execute on function public.log_calls(jsonb) to anon, authenticated;
grant execute on function public.admin_list_calls(timestamptz, boolean, text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.admin_call_failures(timestamptz) to authenticated;

/* ---------- The nightly job ---------- */

-- Every night at 03:23 UTC, a few minutes after the error log's purge (03:17).
select cron.schedule('purge-old-call-log', '23 3 * * *', 'select public.purge_old_call_log();');
