/*
 * Migration: an email to staff for every new person on the waiting list (bundle WAITLIST-2,
 * story S1-E2-24; Robert, 21 Nov 2026, 06:59 UTC, Builder (2) thread: people join the waiting
 * list "and then I get the emails", and 07:05 UTC: "yes, hello@themagiccoffin.com. One per person.").
 *
 * How it works:
 * - Someone signs up without a code while the waiting list is on (WAITLIST-1) and confirms their
 *   email. Only then is the entry "due": an address nobody confirmed may be a typo or a bot, and the
 *   nightly purge deletes it after 7 days anyway.
 * - pg_cron wakes POST /api/waitlist-alerts every 5 minutes while an alert is due
 *   (run_waitlist_alert_worker()), with the notification emails' worker key and address, so no new
 *   by-hand setting is needed. The worker claims the due entries, sends one email per person to the
 *   staff mailbox and marks what left (server/waitlist-alerts.ts).
 * - The mailbox is the setting waitlist_alert_email. Empty means the support address from the
 *   brand config (VITE_BRAND_SUPPORT_EMAIL, today hello@themagiccoffin.com); an address is never
 *   written here (CLAUDE.md, "Names and domains are settings, not code"). Staff › Settings edits it.
 * - People already waiting when this ships are marked as alerted, so the mailbox doesn't get a
 *   burst of old sign-ups.
 *
 * What the email holds: the username, the profile country, the answer (write, read or both) and
 * when they joined. Never the person's email address or year of birth (data minimisation, GDPR
 * art. 5(1)(c)); staff find the rest in Staff › Waitlist.
 * Privacy (CLAUDE.md rule 12): nothing here logs an address. No new table, so no new RLS policy;
 * the two new columns sit on waitlist_entries, whose policies stay as they are.
 * Tests: supabase/tests/database/329-waitlist-staff-alerts.test.sql.
 */

/* ---------- 1. The setting ---------- */

insert into public.settings (key, value, is_public, description) values
  ('waitlist_alert_email', '""'::jsonb, false,
   'Where the email for each new person on the waiting list goes; empty sends it to the support address (WAITLIST-2; Robert, 21 Nov 2026).')
on conflict (key) do nothing;

/* ---------- 2. What was sent ---------- */

alter table public.waitlist_entries
  -- When the staff email about this person left; empty while it is due (or never, for people let
  -- in by a code).
  add column staff_alert_sent_at timestamptz,
  -- When a worker run last took the email, so a second run doesn't send it too.
  add column staff_alert_claimed_at timestamptz,
  -- How many times a worker run has tried; after 5 it stops, so a broken address can't loop.
  add column staff_alert_attempts integer not null default 0;

comment on column public.waitlist_entries.staff_alert_sent_at is
  'When the staff email about this new person on the list left (WAITLIST-2).';

-- Nobody already on the list gets an email now: they joined before staff asked for one.
update public.waitlist_entries set staff_alert_sent_at = now() where staff_alert_sent_at is null;

/* ---------- 3. The worker's functions ---------- */

/**
 * waitlist_alert_worker_claim: claims the staff emails due now: people waiting, not let in, whose
 * email is confirmed and who haven't had theirs, oldest first, at most batch_size, each tried at
 * most 5 times.
 * Inputs: worker_key (the Vault secret email_worker_key); batch_size (1 to 100, default 50).
 * Returns: a JSON array of {id, handle, country_code, interest, joined_at, alert_to}; alert_to is
 *   the setting waitlist_alert_email, empty when the server should use the support address.
 * Errors: insufficient_privilege for a wrong key.
 * Flow: server/waitlist-alerts.ts (handleWaitlistAlerts) calls it, sends, then
 *   waitlist_alert_worker_mark_sent().
 */
create or replace function public.waitlist_alert_worker_claim(worker_key text, batch_size integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed jsonb := '[]'::jsonb;
  alert_to text := coalesce(public.setting_value('waitlist_alert_email') #>> '{}', '');
  due record;
begin
  -- Step 1: only our worker may ask.
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the oldest due entries nobody else is sending.
  for due in
    select entry.id, entry.interest, entry.joined_at, entry.staff_alert_attempts,
           profile.handle, profile.country_code
    from public.waitlist_entries as entry
    join public.profiles as profile on profile.id = entry.user_id
    join auth.users as account on account.id = entry.user_id
    where entry.admitted_at is null and entry.staff_alert_sent_at is null
      and entry.staff_alert_attempts < 5 and account.email_confirmed_at is not null
      and (entry.staff_alert_claimed_at is null or entry.staff_alert_claimed_at < now() - interval '15 minutes')
    order by entry.joined_at
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update of entry skip locked
  loop
    -- Step 3: claim it, so a second worker run doesn't send it too.
    update public.waitlist_entries
    set staff_alert_claimed_at = now(), staff_alert_attempts = due.staff_alert_attempts + 1
    where id = due.id;
    claimed := claimed || jsonb_build_array(jsonb_build_object(
      'id', due.id, 'handle', due.handle, 'country_code', due.country_code,
      'interest', due.interest, 'joined_at', due.joined_at, 'alert_to', alert_to));
  end loop;
  return claimed;
end;
$$;

comment on function public.waitlist_alert_worker_claim(text, integer) is
  'The waiting list alert worker claims the staff emails due now, one per new person (WAITLIST-2).';
revoke execute on function public.waitlist_alert_worker_claim(text, integer) from public;
grant execute on function public.waitlist_alert_worker_claim(text, integer) to anon, authenticated;

/**
 * waitlist_alert_worker_mark_sent: marks the staff emails that left, so they never go twice.
 * Inputs: worker_key; entry_ids (from waitlist_alert_worker_claim()). Returns: how many were marked.
 * Errors: insufficient_privilege for a wrong key.
 */
create or replace function public.waitlist_alert_worker_mark_sent(worker_key text, entry_ids uuid[])
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
  update public.waitlist_entries set staff_alert_sent_at = now()
  where id = any(entry_ids) and staff_alert_sent_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

comment on function public.waitlist_alert_worker_mark_sent(text, uuid[]) is
  'The waiting list alert worker marks the staff emails that left (WAITLIST-2).';
revoke execute on function public.waitlist_alert_worker_mark_sent(text, uuid[]) from public;
grant execute on function public.waitlist_alert_worker_mark_sent(text, uuid[]) to anon, authenticated;

/**
 * run_waitlist_alert_worker: wakes /api/waitlist-alerts through pg_net when a staff email is due.
 * It uses the notification worker's address (Vault email_worker_url) with the last part of the
 * path changed, as the opening email worker does. Does nothing while the Vault lacks the address
 * or the key. Returns: true when it called the worker. Internal: pg_cron, every 5 minutes.
 */
create or replace function public.run_waitlist_alert_worker()
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
     or not exists (select 1 from public.waitlist_entries as entry
                    join auth.users as account on account.id = entry.user_id
                    where entry.admitted_at is null and entry.staff_alert_sent_at is null
                      and entry.staff_alert_attempts < 5 and account.email_confirmed_at is not null) then
    return false;
  end if;
  perform net.http_post(
    url := regexp_replace(worker_url, '/api/[^/?]*$', '/api/waitlist-alerts'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;

comment on function public.run_waitlist_alert_worker() is
  'Internal: calls the waiting list alert worker through pg_net when a staff email is due (WAITLIST-2); pg_cron every 5 minutes.';
revoke execute on function public.run_waitlist_alert_worker() from public, anon, authenticated;

select cron.schedule('run-waitlist-alert-worker', '*/5 * * * *', 'select public.run_waitlist_alert_worker()');
