-- Migration: our own simple error log for errors in the browser (story S1-E1-05).
--
-- Decided 18 Oct 2026, 10:46 (Robert, chat): error tracking for March is our own simple error log
-- in our own database, with no outside service and no new processor; Sentry may come later.
--
-- What it adds:
--   client_errors                 one row per error a browser reported: what went wrong and where,
--                                 never who (no user ID, email, IP address or user text)
--   report_client_error(...)      the only way in, for anyone (signed out included): it trims,
--                                 scrubs and rate-limits before storing
--   admin_list_client_errors(...) how owner and admin read the log until the admin site
--                                 (S1-E11-01) gives it a screen
--   purge_old_client_errors()     deletes rows older than 30 days; pg_cron runs it every night
--
-- Who calls it: the browser's error reporter, src/features/errors/api/clientErrors.ts.
-- Rules it follows:
--   - GDPR art. 5(1)(c), data minimisation in logs (story S1-E1-05, "Legal and compliance"): the
--     row holds the error's name, a scrubbed message, the page's route pattern, the app version,
--     the browser family and the time. Nothing else.
--   - No user_id column, on purpose: an error log doesn't need to know who hit the error, so it is
--     a platform table, not a user action (CLAUDE.md rule 15 covers user content and user actions).
--   - Kept 30 days (proposal, docs/retention.md).

/* ---------- Settings ---------- */

-- Both are proposals; change them by migration until the settings screen (S1-E11-03).
insert into public.settings (key, value, is_public, description) values
  ('client_errors_per_minute', '60'::jsonb, false,
   'Most browser error reports stored per minute, across everyone; more are dropped (S1-E1-05).'),
  ('client_errors_keep_days', '30'::jsonb, false,
   'Days a browser error report is kept before the nightly purge deletes it (S1-E1-05, proposal).');

/* ---------- Table ---------- */

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  -- The error's type, for example "TypeError" or "ChunkLoadError".
  error_name text not null,
  -- The error's message after scrubbing (scrub_error_text below): no emails, tokens, IDs,
  -- web addresses, long numbers or quoted text.
  error_message text not null,
  -- The page's route pattern, for example "/join/:code"; never a query string or a hash.
  route_path text not null,
  -- Which build of the app was running (the commit on Cloudflare, "local" in development).
  app_version text not null,
  -- The browser's family only, never its full user agent or version.
  browser_family text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_errors_name_size check (char_length(error_name) between 1 and 100),
  constraint client_errors_message_size check (char_length(error_message) <= 500),
  constraint client_errors_route_is_a_path check (route_path ~ '^/[^?#]*$' and char_length(route_path) <= 200),
  constraint client_errors_version_shape check (app_version ~ '^[A-Za-z0-9._+-]{1,40}$'),
  constraint client_errors_browser_is_known check (
    browser_family in ('chrome', 'edge', 'firefox', 'safari', 'opera', 'samsung_internet', 'other')
  )
);

comment on table public.client_errors is
  'kind: platform
Errors reported by browsers: name, scrubbed message, route pattern, app version, browser family and time; no user ID, email, IP or user text; kept 30 days (S1-E1-05).';

-- The rate limit and the purge both look rows up by time.
create index client_errors_created_at_idx on public.client_errors (created_at);

create trigger client_errors_set_updated_at
  before update on public.client_errors
  for each row execute function public.set_updated_at();

alter table public.client_errors enable row level security;

/* ---------- Who may read ---------- */

-- A new admin area for the log: owner and admin may look (architecture 1.8.3 puts logs under
-- "Metrics and logs"; this log is admin-only because messages, even scrubbed, are technical).
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('error_log', 'owner', 'view', null),
  ('error_log', 'admin', 'view', null);

/**
 * Policy client_errors_select_admin: owner and admin, in a staff session, read the error log.
 * Why: to find and fix what breaks. Nobody else needs it, and the rows say nothing about who hit
 * an error. Members and visitors only ever write, through report_client_error().
 */
create policy client_errors_select_admin
  on public.client_errors
  for select
  to authenticated
  using ((select public.staff_may('error_log', 'view')));

comment on policy client_errors_select_admin on public.client_errors is
  'Allows owner and admin, in a staff session, to read the browser error log (S1-E1-05).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): authenticated may read
-- and client_errors_select_admin keeps it to owner and admin. Rows arrive only through
-- report_client_error() and leave only through purge_old_client_errors(), so nobody gets a write
-- privilege.
revoke all on public.client_errors from anon, authenticated;
grant select on public.client_errors to authenticated;  -- client_errors_select_admin

/* ---------- Scrubbing (the server's own copy of the browser's rules) ---------- */

/**
 * scrub_error_text: removes anything that could identify a person or carry a secret.
 * Input: raw text from a browser. Returns: the text with web addresses, emails, tokens, IDs,
 *   quoted text and long numbers replaced by placeholders, trimmed to max_length characters.
 * Why both here and in the browser: anyone can call report_client_error() directly, so the
 *   database never trusts the browser to have scrubbed (src/features/errors/lib/scrubErrorText.ts
 *   follows the same rules). Quoted text is removed because messages quote what someone typed.
 */
create or replace function public.scrub_error_text(raw_text text, max_length integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    -- Step 6: long runs of digits (phone numbers, account numbers, timestamps).
    regexp_replace(
      -- Step 5: long unbroken strings of letters, digits, _ and - (API keys, codes, hashes).
      regexp_replace(
        -- Step 4: text in quotes ("…", '…', “…”, „…”), which is often what someone typed.
        regexp_replace(
          -- Step 3: IDs (UUIDs) and signed tokens (JWTs, "eyJ…").
          regexp_replace(
            regexp_replace(
              -- Step 2: email addresses.
              regexp_replace(
                -- Step 1: web addresses, which can carry codes in their query string.
                regexp_replace(coalesce(raw_text, ''), 'https?://[^[:space:]]+', '[url]', 'gi'),
                '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'
              ),
              'eyJ[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+){0,2}', '[token]', 'g'
            ),
            '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '[id]', 'g'
          ),
          -- A single quote counts only after a space, a bracket or the start, so "can't" stays.
          '(^|[[:space:](\[{:=,])("[^"]*"|''[^'']*''|“[^”]*”|„[^”“]*[”“])', '\1[text]', 'g'
        ),
        '[A-Za-z0-9_-]{24,}', '[token]', 'g'
      ),
      '[0-9]{6,}', '[number]', 'g'
    ),
    max_length
  );
$$;

comment on function public.scrub_error_text(text, integer) is
  'Replaces web addresses, emails, tokens, IDs, quoted text and long numbers in error text with placeholders (S1-E1-05).';

/**
 * scrub_route_path: keeps only the path of a page address, with nothing that identifies anyone.
 * Input: what the browser sent (normally a route pattern such as "/join/:code").
 * Returns: the path without its query string or hash, IDs and token-like parts replaced by
 *   ":id" and ":token", at most 200 characters, always starting with "/".
 */
create or replace function public.scrub_route_path(raw_path text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '/' || left(
    ltrim(
      -- Step 3: long numbers and token-like segments (invite codes, reset codes).
      regexp_replace(
        regexp_replace(
          -- Step 2: IDs (UUIDs).
          regexp_replace(
            -- Step 1: drop the query string and the hash, which can carry codes.
            regexp_replace(coalesce(raw_path, ''), '[?#].*$', ''),
            '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', ':id', 'g'
          ),
          '[A-Za-z0-9_-]{24,}', ':token', 'g'
        ),
        '[0-9]{6,}', ':number', 'g'
      ),
      '/'
    ),
    199
  );
$$;

comment on function public.scrub_route_path(text) is
  'Keeps only the path of a page address, without query, hash, IDs or tokens (S1-E1-05).';

/* ---------- Writing ---------- */

/**
 * report_client_error: stores one error a browser reported.
 * Inputs: error_name, error_message, route_path, app_version, browser_family, as the browser
 *   gathered them (src/features/errors/lib/buildErrorReport.ts). Each is trimmed and scrubbed again
 *   here; an unknown browser family becomes "other" and an odd version "unknown".
 * Returns: the new row's ID (the error page shows its start as the error code, so support can find
 *   it), or null when the rate limit dropped the report.
 * Rate limit: there is no user ID or IP address to limit by, so the limit is shared: at most
 *   client_errors_per_minute reports per minute from everyone together (proposal 60). The browser
 *   also sends at most 5 per page load and never the same error twice.
 * Where it fits: anyone, signed out included, may call it; it is the table's only way in.
 */
create or replace function public.report_client_error(
  error_name text,
  error_message text,
  route_path text,
  app_version text,
  browser_family text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  reports_allowed integer := coalesce((public.setting_value('client_errors_per_minute'))::integer, 60);
  reports_last_minute integer;
  new_id uuid;
begin
  -- Step 1: over the shared limit, drop the report quietly (the browser shows no code).
  select count(*) into reports_last_minute
  from public.client_errors as errors
  where errors.created_at > now() - interval '1 minute';
  if reports_last_minute >= reports_allowed then
    return null;
  end if;

  -- Step 2: store the cleaned report.
  insert into public.client_errors (error_name, error_message, route_path, app_version, browser_family)
  values (
    coalesce(nullif(public.scrub_error_text(error_name, 100), ''), 'Error'),
    public.scrub_error_text(error_message, 500),
    public.scrub_route_path(route_path),
    case when app_version ~ '^[A-Za-z0-9._+-]{1,40}$' then app_version else 'unknown' end,
    case
      when browser_family in ('chrome', 'edge', 'firefox', 'safari', 'opera', 'samsung_internet')
        then browser_family
      else 'other'
    end
  )
  returning id into new_id;
  return new_id;
end;
$$;

comment on function public.report_client_error(text, text, text, text, text) is
  'Stores one scrubbed browser error report, unless the shared per-minute limit is reached (S1-E1-05).';

/* ---------- Reading ---------- */

/**
 * admin_list_client_errors: the newest browser errors, for owner and admin.
 * Inputs: since (default: the last 7 days); max_rows (default 200, at most 1000).
 * Returns: one row per error, newest first. Errors: insufficient_privilege unless the caller may
 *   view the error log in a staff session.
 * Where it fits: until the admin site (S1-E11-01) gives the log a screen, an admin runs
 *   `select * from public.admin_list_client_errors();` signed in, or reads it in the SQL editor.
 */
create or replace function public.admin_list_client_errors(
  since timestamptz default now() - interval '7 days',
  max_rows integer default 200
)
returns table (
  id uuid,
  error_name text,
  error_message text,
  route_path text,
  app_version text,
  browser_family text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('error_log', 'view') then
    raise exception 'Only an owner or admin can read the error log.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select errors.id, errors.error_name, errors.error_message, errors.route_path,
           errors.app_version, errors.browser_family, errors.created_at
    from public.client_errors as errors
    where errors.created_at >= admin_list_client_errors.since
    order by errors.created_at desc
    limit least(greatest(coalesce(max_rows, 200), 1), 1000);
end;
$$;

comment on function public.admin_list_client_errors(timestamptz, integer) is
  'The newest browser errors, for owner and admin in a staff session (S1-E1-05).';

/* ---------- Retention ---------- */

/**
 * purge_old_client_errors: deletes error reports older than client_errors_keep_days (30).
 * Returns: how many rows it deleted. Where it fits: pg_cron runs it every night (below); tests call
 *   it directly. Nobody else may run it.
 */
create or replace function public.purge_old_client_errors()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  keep_days integer := coalesce((public.setting_value('client_errors_keep_days'))::integer, 30);
  deleted_rows integer;
begin
  delete from public.client_errors as errors
  where errors.created_at < now() - make_interval(days => keep_days);
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

comment on function public.purge_old_client_errors() is
  'Deletes browser error reports older than client_errors_keep_days (30, proposal); run nightly by pg_cron (S1-E1-05).';

/* ---------- Function privileges ---------- */

revoke execute on function public.scrub_error_text(text, integer) from public, anon, authenticated;
revoke execute on function public.scrub_route_path(text) from public, anon, authenticated;
revoke execute on function public.report_client_error(text, text, text, text, text) from public;
revoke execute on function public.admin_list_client_errors(timestamptz, integer) from public, anon;
revoke execute on function public.purge_old_client_errors() from public, anon, authenticated;
grant execute on function public.report_client_error(text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_client_errors(timestamptz, integer) to authenticated;

/* ---------- The nightly job ---------- */

-- pg_cron runs scheduled jobs inside the database (architecture B17). This is the first job, so
-- the migration switches the extension on; Supabase allows that from a migration.
create extension if not exists pg_cron with schema pg_catalog;

-- Every night at 03:17 UTC (an odd minute, so it doesn't queue behind jobs on the hour).
-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-old-client-errors', '17 3 * * *', 'select public.purge_old_client_errors();');
