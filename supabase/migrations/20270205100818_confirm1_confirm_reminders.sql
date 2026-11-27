/*
 * CONFIRM-1: one reminder for an email address still unconfirmed 7 days after sign-up (Robert,
 * 27 Nov 2026, 18:30 UTC: "If people haven't validated their accounts after 7 days, they should
 * receive a reminder to do so").
 *
 * How it works:
 * - run_confirm_reminder_worker() (pg_cron, every hour) wakes POST /api/confirm-reminders through
 *   pg_net while a reminder is due, with the notification emails' worker key (Vault
 *   email_worker_key, the same value as EMAIL_WORKER_KEY on Cloudflare), so nothing new is set up
 *   by hand;
 * - the worker claims the due accounts (confirm_reminder_claim()), asks Supabase Auth to send the
 *   sign-up email again (POST /auth/v1/resend, the public key), which makes a fresh link and calls
 *   our Send Email hook; the hook words it as the reminder (server/send-email.ts);
 * - confirm_reminder_mark_sent() marks what left, so it never goes twice; a failed one is tried
 *   again on a later run, at most 3 times.
 * It is an account email, so there is no opt-in and no unsubscribe link (Law 506/2004 covers only
 * marketing; S1-E7-02 criterion 1).
 *
 * Keep time: today unconfirmed accounts are deleted after 7 days (unconfirmed_account_days,
 * S1-E13-04), the same day the reminder is due. This migration keeps them 30 days, so the reminder
 * leaves time to press the link (Robert, 27 Nov 2026, 19:11 UTC: "Remind on day 7, delete on
 * day 30"; it replaces the 7 days of 7 Nov 2026).
 * Who calls it: pg_cron and server/confirm-reminders.ts. Never logged: addresses or keys
 * (CLAUDE.md rule 12).
 */

/* ---------- 1. Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('confirm_reminder_days', '7'::jsonb, false,
   'Days after sign-up before an account whose email is still unconfirmed gets its one reminder (CONFIRM-1; Robert, 27 Nov 2026).')
on conflict (key) do nothing;

-- The reminder leaves time before the account is deleted (Robert, 27 Nov 2026, 19:11 UTC).
update public.settings
set value = '30'::jsonb,
    description = 'Days after sign-up before an account whose email was never confirmed is deleted; the reminder goes on day 7 (S1-E13-04; CONFIRM-1).'
where key = 'unconfirmed_account_days';

/* ---------- 2. What was sent ---------- */

alter table public.profiles
  -- When the reminder left; empty while it is due or not yet due. Never cleared, so never twice.
  add column confirm_reminder_sent_at timestamptz,
  -- When a worker run last took it, so a second run doesn't send it too.
  add column confirm_reminder_claimed_at timestamptz,
  -- How many runs have tried; after 3 it stops, so an address Auth refuses can't loop.
  add column confirm_reminder_attempts integer not null default 0;

comment on column public.profiles.confirm_reminder_sent_at is
  'When the one "confirm your email" reminder left (CONFIRM-1).';

/* ---------- 3. Who is due ---------- */

/**
 * confirm_reminder_is_due: whether one account should get its reminder now: not deleted, email
 * still unconfirmed, signed up at least confirm_reminder_days ago, no reminder yet, fewer than 3
 * tries, not a seed persona.
 * Inputs: profile_id. Returns: boolean. Internal: the claim and run_confirm_reminder_worker().
 */
create or replace function public.confirm_reminder_is_due(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.id = profile_id
      and profiles.deleted_at is null
      and profiles.confirm_reminder_sent_at is null
      and profiles.confirm_reminder_attempts < 3
      and users.email_confirmed_at is null
      and users.email is not null
      and users.created_at <= now() - make_interval(days => public.keep_setting('confirm_reminder_days', 7))
      and coalesce(users.raw_app_meta_data ->> 'seed_persona', 'false') <> 'true'
  );
$$;

comment on function public.confirm_reminder_is_due(uuid) is
  'Internal: whether an account''s "confirm your email" reminder is due now (CONFIRM-1).';
revoke execute on function public.confirm_reminder_is_due(uuid) from public, anon, authenticated;

/* ---------- 4. The worker's functions ---------- */

/**
 * confirm_reminder_claim: claims the reminders due now, oldest sign-up first, at most batch_size,
 * skipping any another run took in the last 15 minutes.
 * Inputs: worker_key (the Vault secret email_worker_key); batch_size (1 to 50, default 20, small
 *   because Supabase Auth limits how many emails it sends an hour).
 * Returns: a JSON array of {id, email}; the address is needed to ask Auth to send again.
 * Errors: insufficient_privilege for a wrong key.
 * Flow: server/confirm-reminders.ts calls it, asks Auth to send, then confirm_reminder_mark_sent().
 */
create or replace function public.confirm_reminder_claim(worker_key text, batch_size integer default 20)
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
  -- Step 2: the oldest due accounts nobody else is sending.
  for due in
    select profiles.id, users.email
    from public.profiles
    join auth.users on users.id = profiles.id
    where public.confirm_reminder_is_due(profiles.id)
      and (profiles.confirm_reminder_claimed_at is null
           or profiles.confirm_reminder_claimed_at < now() - interval '15 minutes')
    order by users.created_at
    limit least(greatest(coalesce(batch_size, 20), 1), 50)
    for update of profiles skip locked
  loop
    -- Step 3: claim it, so a second run doesn't send it too, and count the try.
    update public.profiles
    set confirm_reminder_claimed_at = now(),
        confirm_reminder_attempts = profiles.confirm_reminder_attempts + 1
    where profiles.id = due.id;
    claimed := claimed || jsonb_build_array(jsonb_build_object('id', due.id, 'email', due.email));
  end loop;
  return claimed;
end;
$$;

comment on function public.confirm_reminder_claim(text, integer) is
  'The reminder worker claims the "confirm your email" reminders due now (CONFIRM-1).';
revoke execute on function public.confirm_reminder_claim(text, integer) from public;
grant execute on function public.confirm_reminder_claim(text, integer) to anon, authenticated;

/**
 * confirm_reminder_mark_sent: marks the reminders that left, so they never go twice.
 * Inputs: worker_key; profile_ids (from confirm_reminder_claim()). Returns: how many were marked.
 * Errors: insufficient_privilege for a wrong key.
 */
create or replace function public.confirm_reminder_mark_sent(worker_key text, profile_ids uuid[])
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
  update public.profiles set confirm_reminder_sent_at = now()
  where profiles.id = any(profile_ids) and profiles.confirm_reminder_sent_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

comment on function public.confirm_reminder_mark_sent(text, uuid[]) is
  'The reminder worker marks the "confirm your email" reminders that left (CONFIRM-1).';
revoke execute on function public.confirm_reminder_mark_sent(text, uuid[]) from public;
grant execute on function public.confirm_reminder_mark_sent(text, uuid[]) to anon, authenticated;

/**
 * run_confirm_reminder_worker: wakes /api/confirm-reminders through pg_net when a reminder is due.
 * It uses the notification worker's address (Vault email_worker_url) with the last part of the
 * path changed, as the waiting list alerts do. Does nothing while the Vault lacks the address or
 * the key. Returns: true when it called the worker. Internal: pg_cron, every hour at :17.
 */
create or replace function public.run_confirm_reminder_worker()
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
     or not exists (select 1 from public.profiles where public.confirm_reminder_is_due(profiles.id)) then
    return false;
  end if;
  perform net.http_post(
    url := regexp_replace(worker_url, '/api/[^/?]*$', '/api/confirm-reminders'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;

comment on function public.run_confirm_reminder_worker() is
  'Internal: calls the "confirm your email" reminder worker through pg_net when one is due (CONFIRM-1); pg_cron every hour.';
revoke execute on function public.run_confirm_reminder_worker() from public, anon, authenticated;

select cron.schedule('run-confirm-reminder-worker', '17 * * * *', 'select public.run_confirm_reminder_worker()');
