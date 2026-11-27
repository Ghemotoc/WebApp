-- Database tests for the one "confirm your email" reminder (CONFIRM-1; Robert, 27 Nov 2026,
-- 18:30 UTC: "If people haven't validated their accounts after 7 days, they should receive a
-- reminder to do so").
-- What it proves:
-- - the reminder is due 7 days after sign-up (confirm_reminder_days) and unconfirmed accounts are
--   now kept 30 days (unconfirmed_account_days; Robert, 27 Nov 2026, 19:11 UTC);
-- - the worker claims only accounts still unconfirmed after 7 days, once each: not a newer one,
--   not a confirmed one, not a deleted one;
-- - marking sent stops a second reminder; after 3 tries it stops trying;
-- - every function refuses a wrong worker key, and run_confirm_reminder_worker() is closed to
--   members and visitors.
-- No new policy: the three new columns sit on profiles, whose policies earlier tests cover.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- The worker key, as the local Vault holds it.
create temporary table worker as
  select decrypted_secret as worker_key from vault.decrypted_secrets where name = 'email_worker_key';
grant select on worker to anon, authenticated;

-- The accounts this test makes, by name.
create temp table people (name text primary key, user_id uuid);
grant select on people to authenticated, anon;

-- The sign-up data the form sends (as in 390).
create function pg_temp.sign_up_data(handle text)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'handle', handle, 'invite_code', 'PERSONAS-TEST-INVITE', 'birth_year', '1990', 'locale', 'en',
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')));
$$;

-- Inserts an account the way Supabase Auth does, signed up days_ago days back.
create function pg_temp.sign_up(name text, days_ago integer) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    name || '@reminder.test', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
    pg_temp.sign_up_data(name), now(), now(), '', '', '', '');
  -- Moved back after the sign-up trigger ran, as if the person signed up then.
  update auth.users set created_at = now() - make_interval(days => days_ago) where id = new_id;
  insert into people values (name, new_id);
  return new_id;
end;
$$;

-- One test account's user ID.
create function pg_temp.id_of(name text) returns uuid language sql as $$
  select user_id from people where people.name = id_of.name;
$$;

-- The claim, as the worker makes it.
create function pg_temp.claim() returns jsonb language sql as $$
  select public.confirm_reminder_claim((select worker_key from worker));
$$;

/* ---------- 1. The settings ---------- */

select is((select value from public.settings where key = 'confirm_reminder_days'), '7'::jsonb,
  'the reminder is due 7 days after sign-up');
select is((select value from public.settings where key = 'unconfirmed_account_days'), '30'::jsonb,
  'an unconfirmed account is kept 30 days, well after its reminder');

/* ---------- 2. Who is due ---------- */

-- Earlier accounts never get a reminder here; this test only watches its own accounts.
update public.profiles set confirm_reminder_sent_at = now() where confirm_reminder_sent_at is null;

select pg_temp.sign_up('reminder_due', 8);
select pg_temp.sign_up('reminder_too_new', 3);
select pg_temp.sign_up('reminder_confirmed', 8);
select pg_temp.sign_up('reminder_deleted', 8);
update auth.users set email_confirmed_at = now() where id = pg_temp.id_of('reminder_confirmed');
update public.profiles set deleted_at = now() where id = pg_temp.id_of('reminder_deleted');

create temp table first_claim as select pg_temp.claim() as claimed;

select is(jsonb_array_length((select claimed from first_claim)), 1,
  'the worker claims only the account still unconfirmed after 7 days');
select is((select (claimed -> 0 ->> 'id')::uuid from first_claim), pg_temp.id_of('reminder_due'),
  'the claimed account is the one signed up 8 days ago');
select is((select claimed -> 0 ->> 'email' from first_claim), 'reminder_due@reminder.test',
  'the claim carries the address, so Auth can be asked to send the link again');
select is(jsonb_array_length(pg_temp.claim()), 0,
  'a second run straight away claims nothing, so nobody gets two reminders');

/* ---------- 3. Sent, and the three tries ---------- */

select is(public.confirm_reminder_mark_sent((select worker_key from worker),
  array[pg_temp.id_of('reminder_due')]), 1, 'the worker marks the reminder that left');
update public.profiles set confirm_reminder_claimed_at = now() - interval '1 hour'
  where id = pg_temp.id_of('reminder_due');
select is(jsonb_array_length(pg_temp.claim()), 0, 'once sent, the account is never claimed again');

select pg_temp.sign_up('reminder_refused', 9);
update public.profiles set confirm_reminder_attempts = 3 where id = pg_temp.id_of('reminder_refused');
select is(jsonb_array_length(pg_temp.claim()), 0, 'after 3 tries the worker stops trying');

select ok(not public.run_confirm_reminder_worker(),
  'the waker does nothing when no reminder is due');

/* ---------- 4. Only our worker ---------- */

select throws_ok($$ select public.confirm_reminder_claim('wrong key') $$, '42501', null,
  'claiming with a wrong worker key is refused');
select throws_ok($$ select public.confirm_reminder_mark_sent('wrong key', array[]::uuid[]) $$, '42501', null,
  'marking with a wrong worker key is refused');
select ok(not has_function_privilege('authenticated', 'public.run_confirm_reminder_worker()', 'execute')
  and not has_function_privilege('anon', 'public.run_confirm_reminder_worker()', 'execute'),
  'members and visitors cannot wake the worker');

select * from finish();
rollback;
