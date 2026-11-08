/*
 * Migration: "Tell me when you open here" (bundle G5, part a; story S1-E2-10, the "not open in
 * your country yet" page; Robert, 7 Nov 2026, 11:57 UTC, Builder thread: "Tell me when you open
 * here", and when the country opens "the email goes out and people have 7 days to activate").
 *
 * How it works:
 * - A visitor from a country we haven't opened leaves an email address on /not-open. Our server
 *   (server/opening-list.ts, POST /api/opening-list) runs the bot check, signs the fields and
 *   calls join_opening_list(), which keeps the address with the country of the connection (or the
 *   one the visitor picked when the connection gave none) and hands back a one-time token. The
 *   server emails it as a "confirm" link at once; nothing is kept but its hash.
 * - The visitor opens the link: confirm_opening_list() marks the address confirmed. Only
 *   confirmed addresses ever get the opening email (GDPR art. 7(1): we can show they asked).
 * - The same link with "remove" takes the address off the list at any time (art. 7(3)).
 * - When staff open a country (markets.is_open), pg_cron wakes POST /api/opening-emails every 5
 *   minutes while emails are due (run_opening_email_worker(), the notification emails' worker key
 *   and address, so no new by-hand setting). The worker claims them, sends "We're open in <country>"
 *   with a link to sign up, and marks what left.
 * - Every night purge_opening_list() deletes an address that wasn't confirmed within 7 days, and
 *   one 7 days after its opening email went: by then the person has signed up or let it go
 *   (opening_list_keep_days, 7).
 * Privacy (CLAUDE.md rules 5 and 12): only the address, the two countries, the language and the
 * dates; never an IP address, and nothing here logs an address. Only owner and admin, in a staff
 * session, read the rows; Staff › Waitlist shows counts by country, never addresses.
 * No user_id column: the person has no account yet (rule 15 covers members' content and actions,
 * as with public_notices).
 * Signing: the request is signed with the public notice secret (Vault public_notice_secret,
 * NOTICE_SECRET in Cloudflare), with "purpose": "opening_list" in the payload, so no new secret
 * has to be set by hand; submit_public_notice() can't take this payload (it has no kind) and
 * join_opening_list() refuses any payload without that purpose.
 * Tests: supabase/tests/database/313-opening-list.test.sql.
 */

/* ---------- 1. The setting ---------- */

insert into public.settings (key, value, is_public, description) values
  ('opening_list_keep_days', '7'::jsonb, false,
   'Days an unconfirmed "tell me when you open here" address is kept, and days after its opening email (G5a; Robert, 7 Nov 2026).')
on conflict (key) do nothing;

/* ---------- 2. The list ---------- */

create table public.opening_list (
  id uuid primary key default gen_random_uuid(),
  -- The address to write to, in lower case. Personal data: never logged (rule 12).
  email text not null,
  -- The country the person wants to hear about: the connection's, or the one they picked.
  country_code text not null,
  -- The country of the connection when they asked, or null when it gave none.
  detected_country_code text,
  -- The language of the emails.
  language text not null default 'ro',
  -- The hash of the one-time token in the confirm and remove link (SHA-256, hex).
  token_hash text not null,
  -- When the last confirm email was asked for; a second ask within 10 minutes sends nothing.
  token_sent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  -- The opening email: claimed by the worker, then sent; tried at most 5 times.
  open_email_claimed_at timestamptz,
  open_email_sent_at timestamptz,
  open_email_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_list_one_per_country unique (email, country_code),
  constraint opening_list_email_shape check (
    char_length(email) <= 254 and email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint opening_list_country_is_alpha2 check (country_code ~ '^[A-Z]{2}$'),
  constraint opening_list_detected_is_alpha2 check (
    detected_country_code is null or detected_country_code ~ '^[A-Z]{2}$'),
  constraint opening_list_language_is_known check (language in ('ro', 'en')),
  constraint opening_list_token_hash_shape check (token_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.opening_list is
  'kind: platform
"Tell me when you open here": addresses of visitors from a country we haven''t opened, to email once when it opens (G5a; S1-E2-10). Unconfirmed ones go after 7 days, the rest 7 days after the opening email.';
comment on column public.opening_list.email is 'Personal data: only owner and admin read it; never logged (rule 12).';

create index opening_list_due on public.opening_list (country_code)
  where confirmed_at is not null and open_email_sent_at is null;

create trigger opening_list_set_updated_at
  before update on public.opening_list
  for each row execute function public.set_updated_at();

alter table public.opening_list enable row level security;

/**
 * Policy opening_list_select_staff: owner and admin, in a staff session, read the list.
 * Why: Staff › Waitlist counts who is waiting for each country (WAITLIST-1 gave owner and admin
 * the waitlist area). Nobody writes directly: the functions below do.
 */
create policy opening_list_select_staff
  on public.opening_list for select to authenticated
  using ((select public.staff_may('waitlist', 'view')));

comment on policy opening_list_select_staff on public.opening_list is
  'Allows owner and admin, in a staff session, to read the "tell me when you open here" list (G5a).';

revoke all on public.opening_list from anon, authenticated;
grant select on public.opening_list to authenticated;  -- opening_list_select_staff

/* ---------- 3. Joining, confirming and leaving ---------- */

/**
 * opening_list_token_hash: the stored form of a token. Internal.
 * Input: the token as it travels in the link. Returns: its SHA-256, hex.
 */
create or replace function public.opening_list_token_hash(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex');
$$;

comment on function public.opening_list_token_hash(text) is
  'Internal: the SHA-256 of a "tell me when you open here" token (G5a).';
revoke execute on function public.opening_list_token_hash(text) from public, anon, authenticated;

/**
 * join_opening_list: puts an address on the list for a country, or refreshes its link.
 * Inputs: payload, the JSON our server signed: {purpose: "opening_list", email, countryCode,
 *   detectedCountryCode, language}; signature, its HMAC (public_notice_payload_is_signed()).
 * Returns: the one-time token for the confirm email, or null when no email should go: the address
 *   is already confirmed, or a link went less than 10 minutes ago (so the form can't be used to
 *   flood someone's inbox). The answer to the visitor is the same either way.
 * Errors: insufficient_privilege for an unsigned payload or another purpose; check_violation when
 *   the country is already open (sign up instead) or a field breaks the table's checks.
 * Flow: server/opening-list.ts calls it after the bot check, then sends the confirm email.
 */
create or replace function public.join_opening_list(payload text, signature text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  fields jsonb;
  wanted_email text;
  wanted_country text;
  existing public.opening_list;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  -- Step 1: only a payload our server signed, for this purpose.
  if not public.public_notice_payload_is_signed(payload, signature) then
    raise exception 'This request didn''t come through the form.' using errcode = 'insufficient_privilege';
  end if;
  fields := payload::jsonb;
  if fields ->> 'purpose' is distinct from 'opening_list' then
    raise exception 'This request didn''t come through the form.' using errcode = 'insufficient_privilege';
  end if;
  wanted_email := lower(btrim(coalesce(fields ->> 'email', '')));
  wanted_country := upper(btrim(coalesce(fields ->> 'countryCode', '')));
  -- Step 2: an open country needs no list; the person can sign up now.
  if exists (select 1 from public.markets where markets.country_code = wanted_country and markets.is_open) then
    raise exception 'We are already open there.' using errcode = 'check_violation', hint = 'already_open';
  end if;
  -- Step 3: a known address keeps its row; a confirmed one, or one sent a link a moment ago, gets no email.
  select * into existing from public.opening_list
  where opening_list.email = wanted_email and opening_list.country_code = wanted_country;
  if found then
    if existing.confirmed_at is not null or existing.token_sent_at > now() - interval '10 minutes' then
      return null;
    end if;
    update public.opening_list
    set token_hash = public.opening_list_token_hash(token), token_sent_at = now(),
        language = coalesce(fields ->> 'language', existing.language)
    where id = existing.id;
    return token;
  end if;
  -- Step 4: a new address; the table's checks refuse a malformed one.
  insert into public.opening_list (email, country_code, detected_country_code, language, token_hash)
  values (wanted_email, wanted_country, nullif(upper(btrim(coalesce(fields ->> 'detectedCountryCode', ''))), ''),
          coalesce(fields ->> 'language', 'ro'), public.opening_list_token_hash(token));
  return token;
end;
$$;

comment on function public.join_opening_list(text, text) is
  'Puts an address on the "tell me when you open here" list; only a payload signed by our server (G5a).';
revoke execute on function public.join_opening_list(text, text) from public;
grant execute on function public.join_opening_list(text, text) to anon, authenticated;

/**
 * confirm_opening_list: confirms the address whose link was opened.
 * Input: the token from the link. Returns: the country it is waiting for (ISO alpha-2).
 * Errors: check_violation with hint 'not_found' when the token matches nothing (wrong, removed or
 *   past its 7 days).
 * Flow: the /open-here page, signed out, right after the person opens the confirm link.
 */
create or replace function public.confirm_opening_list(token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed_country text;
begin
  update public.opening_list
  set confirmed_at = coalesce(opening_list.confirmed_at, now())
  where opening_list.token_hash = public.opening_list_token_hash(token)
  returning opening_list.country_code into confirmed_country;
  if confirmed_country is null then
    raise exception 'This link doesn''t work any more.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  return confirmed_country;
end;
$$;

comment on function public.confirm_opening_list(text) is
  'Confirms a "tell me when you open here" address from its emailed link (G5a; GDPR art. 7(1)).';
revoke execute on function public.confirm_opening_list(text) from public;
grant execute on function public.confirm_opening_list(text) to anon, authenticated;

/**
 * leave_opening_list: takes the address off the list.
 * Input: the token from the link. Returns: true when an address was removed, false when the link
 *   matched nothing (already gone): the page says the same either way.
 * Flow: the /open-here page with "remove", from the link in the confirm email (GDPR art. 7(3)).
 */
create or replace function public.leave_opening_list(token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.opening_list where opening_list.token_hash = public.opening_list_token_hash(token);
  return found;
end;
$$;

comment on function public.leave_opening_list(text) is
  'Takes a "tell me when you open here" address off the list from its emailed link (G5a; GDPR art. 7(3)).';
revoke execute on function public.leave_opening_list(text) from public;
grant execute on function public.leave_opening_list(text) to anon, authenticated;

/* ---------- 4. The opening emails ---------- */

/**
 * opening_email_worker_claim: claims the opening emails due now: confirmed addresses whose country
 * is open and that haven't had theirs, at most batch_size, each tried at most 5 times.
 * Inputs: worker_key (the Vault secret email_worker_key); batch_size (1 to 100, default 50).
 * Returns: a JSON array of {id, to, country_code, language}.
 * Errors: insufficient_privilege for a wrong key.
 * Flow: server/opening-list.ts (handleOpeningEmails) calls it, sends, then opening_email_worker_mark_sent().
 */
create or replace function public.opening_email_worker_claim(worker_key text, batch_size integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed jsonb := '[]'::jsonb;
  due record;
begin
  -- Step 1: only our worker may ask.
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the oldest due addresses nobody else is sending to.
  for due in
    select list.* from public.opening_list as list
    join public.markets on markets.country_code = list.country_code and markets.is_open
    where list.confirmed_at is not null and list.open_email_sent_at is null and list.open_email_attempts < 5
      and (list.open_email_claimed_at is null or list.open_email_claimed_at < now() - interval '15 minutes')
    order by list.confirmed_at
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update of list skip locked
  loop
    -- Step 3: claim it, so a second worker run doesn't send it too.
    update public.opening_list
    set open_email_claimed_at = now(), open_email_attempts = due.open_email_attempts + 1
    where id = due.id;
    claimed := claimed || jsonb_build_array(jsonb_build_object(
      'id', due.id, 'to', due.email, 'country_code', due.country_code, 'language', due.language));
  end loop;
  return claimed;
end;
$$;

comment on function public.opening_email_worker_claim(text, integer) is
  'The opening email worker claims the "we''re open in your country" emails due now (G5a).';
revoke execute on function public.opening_email_worker_claim(text, integer) from public;
grant execute on function public.opening_email_worker_claim(text, integer) to anon, authenticated;

/**
 * opening_email_worker_mark_sent: marks the opening emails that left, so they never go twice; the
 * 7 days to sign up count from now.
 * Inputs: worker_key; email_ids (from opening_email_worker_claim()). Returns: how many were marked.
 * Errors: insufficient_privilege for a wrong key.
 */
create or replace function public.opening_email_worker_mark_sent(worker_key text, email_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked integer;
begin
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.opening_list set open_email_sent_at = now()
  where id = any(email_ids) and open_email_sent_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

comment on function public.opening_email_worker_mark_sent(text, uuid[]) is
  'The opening email worker marks the emails that left (G5a).';
revoke execute on function public.opening_email_worker_mark_sent(text, uuid[]) from public;
grant execute on function public.opening_email_worker_mark_sent(text, uuid[]) to anon, authenticated;

/**
 * run_opening_email_worker: wakes /api/opening-emails through pg_net when opening emails are due.
 * It uses the notification worker's address (Vault email_worker_url) with the last part of the
 * path changed, as the support worker does, so no new by-hand setting is needed. Does nothing
 * while the Vault lacks the address or the key. Internal: pg_cron, every 5 minutes.
 */
create or replace function public.run_opening_email_worker()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'email_worker_url';
  select decrypted_secret into worker_key from vault.decrypted_secrets where name = 'email_worker_key';
  if coalesce(worker_url, '') = '' or coalesce(worker_key, '') = ''
     or not exists (select 1 from public.opening_list as list
                    join public.markets on markets.country_code = list.country_code and markets.is_open
                    where list.confirmed_at is not null and list.open_email_sent_at is null
                      and list.open_email_attempts < 5) then
    return false;
  end if;
  perform net.http_post(
    url := regexp_replace(worker_url, '/api/[^/?]*$', '/api/opening-emails'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;

comment on function public.run_opening_email_worker() is
  'Internal: calls the opening email worker through pg_net when opening emails are due (G5a); pg_cron every 5 minutes.';
revoke execute on function public.run_opening_email_worker() from public, anon, authenticated;

select cron.schedule('run-opening-email-worker', '*/5 * * * *', 'select public.run_opening_email_worker()');

/* ---------- 5. The nightly clean-up ---------- */

/**
 * purge_opening_list: deletes addresses not confirmed within opening_list_keep_days (7), and those
 * whose opening email went that many days ago (Robert, 7 Nov 2026: 7 days to activate).
 * Returns: how many were deleted. Internal: pg_cron, every night at 03:59 UTC.
 */
create or replace function public.purge_opening_list()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  keep_days integer := coalesce((public.setting_value('opening_list_keep_days'))::integer, 7);
  deleted_rows integer;
begin
  delete from public.opening_list as list
  where (list.confirmed_at is null and list.created_at < now() - make_interval(days => keep_days))
     or (list.open_email_sent_at < now() - make_interval(days => keep_days));
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

comment on function public.purge_opening_list() is
  'Deletes unconfirmed "tell me when you open here" addresses after 7 days, and the rest 7 days after their opening email (G5a).';
revoke execute on function public.purge_opening_list() from public, anon, authenticated;

-- Every night at 03:59 UTC, a minute no other job uses. cron.schedule replaces a job of the same
-- name, so running the migration twice is safe.
select cron.schedule('purge-opening-list', '59 3 * * *', 'select public.purge_opening_list();');

/* ---------- 6. Counts for Staff › Waitlist ---------- */

/**
 * admin_opening_list_counts: how many addresses wait for each country, confirmed or not.
 * Returns: rows {country_code, confirmed, unconfirmed}, the most confirmed first. Never an address.
 * Errors: insufficient_privilege for anyone but owner and admin in a staff session.
 * Flow: Staff › Waitlist, "Waiting for their country to open".
 */
create or replace function public.admin_opening_list_counts()
returns table (country_code text, confirmed bigint, unconfirmed bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('waitlist', 'view') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select list.country_code,
           count(*) filter (where list.confirmed_at is not null),
           count(*) filter (where list.confirmed_at is null)
    from public.opening_list as list
    where list.open_email_sent_at is null
    group by list.country_code
    order by 2 desc, 1;
end;
$$;

comment on function public.admin_opening_list_counts() is
  'Staff › Waitlist: how many addresses wait for each closed country; never an address (G5a).';
revoke execute on function public.admin_opening_list_counts() from public, anon;
grant execute on function public.admin_opening_list_counts() to authenticated;
