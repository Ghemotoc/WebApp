-- Database tests for the staff email about each new person on the waiting list (bundle
-- WAITLIST-2; Robert, 21 Nov 2026, 07:05 UTC: "One per person.").
-- What it proves:
-- - the setting waitlist_alert_email exists, is private and is empty by default (the server then
--   uses the support address from the brand config);
-- - the worker claims only people who wait, confirmed their email and haven't had their email,
--   once each; someone let in by a code or still unconfirmed gets none;
-- - what it hands over is the username, country, answer and joining time, never an email address;
-- - marking sent stops a second email; after 5 tries it stops trying;
-- - every function refuses a wrong worker key, and run_waitlist_alert_worker() is closed to
--   members and visitors.
-- No new policy: the two new columns sit on waitlist_entries, whose policies 310 covers.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- The worker key, as the local Vault holds it.
create temporary table worker as
  select decrypted_secret as worker_key from vault.decrypted_secrets where name = 'email_worker_key';
grant select on worker to anon, authenticated;

-- The accounts this test makes, by name.
create temp table people (name text primary key, user_id uuid);
grant select on people to authenticated, anon;

-- The sign-up data the form sends (as in 310), with or without a code.
create function pg_temp.sign_up_data(handle text, invite_code text default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'handle', handle, 'invite_code', invite_code, 'birth_year', '1990', 'locale', 'en',
    'waitlist_interest', 'write',
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')));
$$;

-- Inserts an account the way Supabase Auth does and remembers it by name.
create function pg_temp.sign_up(name text, sign_up_data jsonb) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    name || '@waitlist.test', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}', sign_up_data,
    now(), now(), '', '', '', '');
  insert into people values (name, new_id);
  return new_id;
end;
$$;

-- Confirms an account's email, as the link in the confirmation email does.
create function pg_temp.confirm(name text) returns void language sql as $$
  update auth.users set email_confirmed_at = now() where id = (select user_id from people where people.name = confirm.name);
$$;

-- The entry of one test account.
create function pg_temp.entry_of(name text) returns uuid language sql as $$
  select entries.id from public.waitlist_entries as entries
  join people on people.user_id = entries.user_id where people.name = entry_of.name;
$$;

-- The claim, as the worker makes it.
create function pg_temp.claim() returns jsonb language sql as $$
  select public.waitlist_alert_worker_claim((select worker_key from worker));
$$;

/* ---------- 1. The setting ---------- */

select is((select value from public.settings where key = 'waitlist_alert_email'), '""'::jsonb,
  'the mailbox setting is empty by default, so the support address from the brand config is used');
select ok(not (select is_public from public.settings where key = 'waitlist_alert_email'),
  'the mailbox setting is private');

/* ---------- 2. Who is due ---------- */

-- Earlier entries never get an email; this test only watches its own accounts.
update public.waitlist_entries set staff_alert_sent_at = now() where staff_alert_sent_at is null;

select pg_temp.sign_up('alert_waiting', pg_temp.sign_up_data('alert_waiting'));
select pg_temp.sign_up('alert_unconfirmed', pg_temp.sign_up_data('alert_unconfirmed'));
select pg_temp.confirm('alert_waiting');

create temp table first_claim as select pg_temp.claim() as claimed;

select is(jsonb_array_length((select claimed from first_claim)), 1,
  'the worker claims the confirmed person who waits, and not the one who has not confirmed yet');
select is((select claimed -> 0 ->> 'handle' from first_claim), 'alert_waiting',
  'the claim names the person by username');
select is((select claimed -> 0 ->> 'interest' from first_claim), 'write',
  'the claim carries the answer to "write, read or both"');
select ok(not ((select claimed::text from first_claim) like '%@waitlist.test%'),
  'the claim never carries an email address');
select is(jsonb_array_length(pg_temp.claim()), 0,
  'a second run straight away claims nothing, so nobody gets two emails');

/* ---------- 3. Sent, and the five tries ---------- */

select is(public.waitlist_alert_worker_mark_sent((select worker_key from worker),
  array[pg_temp.entry_of('alert_waiting')]), 1, 'the worker marks the email that left');
update public.waitlist_entries set staff_alert_claimed_at = now() - interval '1 hour'
  where id = pg_temp.entry_of('alert_waiting');
select is(jsonb_array_length(pg_temp.claim()), 0, 'once sent, the person is never claimed again');

select pg_temp.confirm('alert_unconfirmed');
update public.waitlist_entries set staff_alert_attempts = 5 where id = pg_temp.entry_of('alert_unconfirmed');
select is(jsonb_array_length(pg_temp.claim()), 0, 'after 5 tries the worker stops trying');

/* ---------- 4. Let in by a code: no email ---------- */

-- The seed's persona invitation code, as 310 uses it.
select pg_temp.sign_up('alert_coded', pg_temp.sign_up_data('alert_coded', 'PERSONAS-TEST-INVITE'));
select pg_temp.confirm('alert_coded');
select is(jsonb_array_length(pg_temp.claim()), 0,
  'someone an invitation code let in skips the queue, so staff get no email about them');

/* ---------- 5. Only our worker ---------- */

select throws_ok($$ select public.waitlist_alert_worker_claim('wrong key') $$, '42501', null,
  'claiming with a wrong worker key is refused');
select throws_ok($$ select public.waitlist_alert_worker_mark_sent('wrong key', array[]::uuid[]) $$, '42501', null,
  'marking with a wrong worker key is refused');
select ok(not has_function_privilege('authenticated', 'public.run_waitlist_alert_worker()', 'execute')
  and not has_function_privilege('anon', 'public.run_waitlist_alert_worker()', 'execute'),
  'members and visitors cannot wake the worker');

select * from finish();
rollback;
