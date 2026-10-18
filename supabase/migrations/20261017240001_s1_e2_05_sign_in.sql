-- Log in: the pause after wrong tries, and the signed-in devices list (story S1-E2-05).
--
-- What it adds:
--   sign_in_failures              one row per wrong log-in try: a hash of the email and the time,
--                                 never the email, the user ID or the IP address
--   sign_in_pause_until(hash)     the log-in screen's question "is this email paused?"
--   record_sign_in_failure(hash)  the screen notes a wrong try
--   clear_my_sign_in_failures()   a successful log-in or a new password clears the tries
--   list_my_sessions()            where the signed-in person is logged in (browser, times), from
--                                 Supabase's own auth.sessions, never the IP (decided 17 Oct 2026,
--                                 19:43, Q13)
--   end_my_session(id)            logs one of the person's own devices out
-- Rules (story S1-E2-05; canvas 2.2; decided 17 Oct 2026, 19:43, Q12):
--   - five wrong tries in a row pause logging in to that account for 15 minutes; both are
--     settings; a successful log-in or a password reset clears the tries;
--   - an email with no account behaves exactly the same, so the pause never reveals who has an
--     account;
--   - the honest limit: the pause works through our screens. Direct, scripted calls to Supabase
--     Auth are held back by Supabase's own per-address limits; a true per-account lock needs a
--     paid-plan hook (check before relying on it).
-- Personal data: the email hash is pseudonymous; rows are removed after 24 hours
-- (docs/retention.md).

insert into public.settings (key, value, is_public, description) values
  ('sign_in_pause_tries', '5'::jsonb, true,
   'Wrong log-in tries in a row before logging in pauses (S1-E2-05, canvas 2.2).'),
  ('sign_in_pause_minutes', '15'::jsonb, true,
   'How long logging in pauses after too many wrong tries (S1-E2-05, canvas 2.2).');

create table public.sign_in_failures (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 (hex) of the email in lower case without spaces at either end; never the email.
  email_hash text not null,
  failed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sign_in_failures_hash_is_sha256 check (email_hash ~ '^[0-9a-f]{64}$')
);

-- No user_id on purpose: an unknown email must look exactly like a known one, so the table never
-- says whether an account exists. That makes it a platform table, not a user action.
comment on table public.sign_in_failures is
  'kind: platform
Wrong log-in tries by email hash and time only, no user ID or IP; removed after 24 hours (S1-E2-05).';

create index sign_in_failures_email_hash_idx on public.sign_in_failures (email_hash, failed_at);

create trigger sign_in_failures_set_updated_at
  before update on public.sign_in_failures
  for each row execute function public.set_updated_at();

alter table public.sign_in_failures enable row level security;

/**
 * Policy sign_in_failures_select_admin: owner and admin read the wrong tries.
 * Why: only to look into an attack; the rows hold no email, user ID or IP. Nobody else needs
 * them: the log-in screen asks through sign_in_pause_until().
 */
create policy sign_in_failures_select_admin
  on public.sign_in_failures
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy sign_in_failures_select_admin on public.sign_in_failures is
  'Allows owner and admin to read wrong log-in tries (hash and time only) (S1-E2-05).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): authenticated may
-- read, and sign_in_failures_select_admin keeps it to owner and admin. Rows change only through
-- the functions below, so nobody gets a write privilege.
revoke all on public.sign_in_failures from anon, authenticated;
grant select on public.sign_in_failures to authenticated;  -- sign_in_failures_select_admin

/**
 * hash_email: the hash stored for an email.
 * Input: email. Returns: SHA-256 in hex of the email in lower case without outer spaces. The app
 *   hashes the same way in the browser (src/features/auth/lib/emailHash.ts), so the email itself
 *   never reaches this table.
 */
create or replace function public.hash_email(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(btrim(coalesce(email, ''))), 'sha256'), 'hex');
$$;

comment on function public.hash_email(text) is
  'SHA-256 (hex) of an email in lower case: the only form sign_in_failures keeps (S1-E2-05).';
revoke execute on function public.hash_email(text) from public, anon, authenticated;

/**
 * sign_in_pause_until: when logging in with this email may start again.
 * Input: email_hash, from the browser. Returns: the time the pause ends, or null when there is no
 *   pause. The same answer for any email, with or without an account.
 * Who may call it: anyone, signed out included (the log-in screen asks before trying).
 */
create or replace function public.sign_in_pause_until(email_hash text)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tries_allowed integer := coalesce((public.setting_value('sign_in_pause_tries'))::integer, 5);
  pause_length interval := make_interval(
    mins => coalesce((public.setting_value('sign_in_pause_minutes'))::integer, 15)
  );
  recent_tries integer;
  last_try timestamptz;
begin
  -- Count the wrong tries within the pause length; the last one starts the pause.
  select count(*), max(failures.failed_at) into recent_tries, last_try
  from public.sign_in_failures as failures
  where failures.email_hash = sign_in_pause_until.email_hash
    and failures.failed_at > now() - pause_length;
  if recent_tries >= tries_allowed then
    return last_try + pause_length;
  end if;
  return null;
end;
$$;

comment on function public.sign_in_pause_until(text) is
  'When logging in with this email hash may start again, or null; the same for any email (S1-E2-05).';

/**
 * record_sign_in_failure: notes one wrong log-in try.
 * Input: email_hash, from the browser (64 hexadecimal characters).
 * Returns: when the pause ends if this try started one (or one was already running), else null.
 * Errors: check_violation for something that isn't a SHA-256 hash.
 * Housekeeping: removes tries older than 24 hours, so the table never grows without limit and
 *   docs/retention.md holds without a scheduled job. During a pause nothing more is stored.
 * Who may call it: anyone, signed out included (the log-in screen, after Supabase says no).
 */
create or replace function public.record_sign_in_failure(email_hash text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  pause_end timestamptz;
begin
  -- Step 1: a hash, never anything that could be an email.
  if coalesce(email_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Expected a SHA-256 hash.' using errcode = 'check_violation';
  end if;
  -- Step 2: forget tries older than a day (retention: 24 hours).
  delete from public.sign_in_failures where failed_at < now() - interval '24 hours';
  -- Step 3: during a pause, store nothing more; otherwise note the try and ask again.
  pause_end := public.sign_in_pause_until(email_hash);
  if pause_end is not null then
    return pause_end;
  end if;
  insert into public.sign_in_failures (email_hash) values (record_sign_in_failure.email_hash);
  return public.sign_in_pause_until(email_hash);
end;
$$;

comment on function public.record_sign_in_failure(text) is
  'Notes one wrong log-in try for an email hash; answers when a pause ends, if one runs (S1-E2-05).';

/**
 * clear_my_sign_in_failures: forgets the wrong tries for the signed-in person's email.
 * Returns: nothing. Who may call it: a signed-in person, after logging in or choosing a new
 *   password (S1-E2-05: "a successful log-in or a password reset clears it").
 */
create or replace function public.clear_my_sign_in_failures()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.sign_in_failures
  where email_hash = public.hash_email((select users.email from auth.users where users.id = (select auth.uid())));
$$;

comment on function public.clear_my_sign_in_failures() is
  'Forgets the wrong log-in tries for the signed-in person''s email (S1-E2-05).';

revoke execute on function public.sign_in_pause_until(text) from public;
revoke execute on function public.record_sign_in_failure(text) from public;
revoke execute on function public.clear_my_sign_in_failures() from public, anon;
grant execute on function public.sign_in_pause_until(text) to anon, authenticated;
grant execute on function public.record_sign_in_failure(text) to anon, authenticated;
grant execute on function public.clear_my_sign_in_failures() to authenticated;

/**
 * list_my_sessions: where the signed-in person is logged in.
 * Returns: one row per session: its ID, the browser's user agent, when it started, when it was
 *   last active, and whether it is this device. Never the IP address (decided 17 Oct 2026, 19:43,
 *   Q13; board 6.3: "We don't keep your IP address or where you are").
 * Why Supabase's own table: auth.sessions already holds every session; a copy of our own would
 *   only drift (Q13, replacing the story note's user_sessions).
 * Who may call it: any signed-in person, for their own sessions only.
 */
create or replace function public.list_my_sessions()
returns table (
  session_id uuid,
  user_agent text,
  started_at timestamptz,
  last_active_at timestamptz,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sessions.id,
    sessions.user_agent,
    sessions.created_at,
    coalesce(sessions.refreshed_at::timestamptz, sessions.updated_at, sessions.created_at),
    sessions.id::text = (select auth.jwt() ->> 'session_id')
  from auth.sessions
  where sessions.user_id = (select auth.uid())
    and (sessions.not_after is null or sessions.not_after > now())
  order by 4 desc;
$$;

comment on function public.list_my_sessions() is
  'The signed-in person''s own sessions: browser, start, last active, this device; never the IP (S1-E2-05).';

/**
 * end_my_session: logs one of the signed-in person's own devices out.
 * Input: target_session_id, from list_my_sessions(). Returns: true when a session was ended,
 *   false when there was none of theirs with that ID (someone else's is never touched).
 * How quickly: the device can't renew its access any more; a token it already holds lasts until
 *   it expires (at most an hour), the same as Supabase's own "sign out other devices".
 */
create or replace function public.end_my_session(target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.sessions
  where sessions.id = target_session_id and sessions.user_id = (select auth.uid());
  return found;
end;
$$;

comment on function public.end_my_session(uuid) is
  'Logs one of the signed-in person''s own devices out; never someone else''s (S1-E2-05).';

revoke execute on function public.list_my_sessions() from public, anon;
revoke execute on function public.end_my_session(uuid) from public, anon;
grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.end_my_session(uuid) to authenticated;
