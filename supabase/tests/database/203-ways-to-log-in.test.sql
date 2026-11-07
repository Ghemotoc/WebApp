-- Database tests for Google, Apple, Microsoft and passkeys, and Settings › Ways to log in (story
-- S1-E2-09; CLAUDE.md rule 1).
-- What it proves:
-- - a provider account starts with no profile, and finishing it runs the same sign-up rules as a
--   password sign-up: a refusal keeps nothing and says which rule; a good answer makes the profile
--   and the consents (criterion 2);
-- - an unfinished provider account can be cancelled, and is purged after a day;
-- - a provider can't join an account that is already set up unless the person asked for it from
--   Settings in the last ten minutes (criterion 5);
-- - connecting or disconnecting a way to log in is notified and always emailed (criterion 4);
-- - my_login_methods() lists the methods without any provider email;
-- - policy identity_link_requests_select_own: allowed and denied.
-- How sign-ups are simulated: inserts into auth.users and auth.identities, the way Supabase Auth
-- writes them.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- The invite-only test with the waiting list off (WAITLIST-1 is tested in 310): without a code,
-- sign-up is refused, as before the list.
update public.feature_flags set is_enabled = false where key = 'waitlist';

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- A Google account as Supabase Auth makes it: the user, then its identity. Returns its user ID.
create function pg_temp.google_account(email text, made_at timestamptz default now()) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', email, now(),
    '{"provider": "google", "providers": ["google"]}', '{"full_name": "A Person"}', made_at, made_at,
    '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values ('google-' || new_id, new_id, jsonb_build_object('sub', 'google-' || new_id, 'email', email),
    'google', now(), now());
  return new_id;
end;
$$;

-- The answers the sign-up form keeps while the person is at Google, with version 0.1 in English.
create function pg_temp.answers(birth_year integer, handle text) returns jsonb language sql as $$
  select jsonb_build_object(
    'invite_code', 'PERSONAS-TEST-INVITE',
    'birth_year', birth_year,
    'locale', 'en',
    'handle', handle,
    'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en'));
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = true where key = 'social_login';
create temporary table accounts as select pg_temp.google_account('new.reader@example.com') as new_reader;
grant select on accounts to anon, authenticated;

/* ---------- 1. Finishing a provider sign-up ---------- */

select is((select count(*)::integer from public.profiles where id = (select new_reader from accounts)), 0,
  'a Google account starts with no profile, so it can''t read or write yet');
select is(public.account_state((select new_reader from accounts))::text, 'deleted',
  'and the account gate treats it as no account');

select pg_temp.sign_out();
select throws_ok($$ select public.finish_social_sign_up('{}'::jsonb) $$, '42501', null,
  'a visitor can''t finish a sign-up');

select pg_temp.sign_in((select new_reader::text from accounts));
select is(public.finish_social_sign_up(pg_temp.answers(extract(year from now())::integer - 10, 'social_reader')),
  '{"outcome": "refused", "rule": "age"}'::jsonb, 'a year under 13 is refused by the age rules');
select is(public.finish_social_sign_up(pg_temp.answers(1990, 'ad min')),
  '{"outcome": "refused", "rule": "username"}'::jsonb, 'a username the rules refuse is refused');
select is(public.finish_social_sign_up(pg_temp.answers(1990, 'social_reader') - 'invite_code'),
  '{"outcome": "refused", "rule": "invite"}'::jsonb, 'without an invite it is refused while invite_only is on');
select is((select count(*)::integer from public.profiles where id = (select new_reader from accounts)), 0,
  'a refusal keeps nothing');
select is(public.finish_social_sign_up(pg_temp.answers(1990, 'social_reader')) ->> 'outcome', 'ok',
  'good answers finish the sign-up');
select is((select handle from public.profiles where id = (select new_reader from accounts)), 'social_reader',
  'the profile has the username from the form');
select is((select count(*)::integer from public.consents where user_id = (select new_reader from accounts)), 2,
  'the terms and the privacy notice are recorded as accepted');
select is(public.finish_social_sign_up(pg_temp.answers(1990, 'social_reader')) ->> 'outcome', 'finished',
  'finishing twice changes nothing');
select throws_ok($$ select public.cancel_social_sign_up() $$, '23514', null,
  'a finished account can''t be cancelled as a sign-up');

/* ---------- 2. Cancelling and the clean-up ---------- */

select pg_temp.as_owner();
create temporary table more_accounts as
  select pg_temp.google_account('changed.mind@example.com') as changed_mind,
         pg_temp.google_account('closed.browser@example.com', now() - interval '2 days') as closed_browser;
grant select on more_accounts to anon, authenticated;
select pg_temp.sign_in((select changed_mind::text from more_accounts));
select lives_ok($$ select public.cancel_social_sign_up() $$, 'an unfinished sign-up can be cancelled');
select pg_temp.as_owner();
select is((select count(*)::integer from auth.users where id = (select changed_mind from more_accounts)), 0,
  'and the account is gone');
select is(public.purge_unfinished_social_sign_ups(), 1, 'the hourly job removes one never finished after a day');

/* ---------- 3. Never merged silently ---------- */

-- adult_writer (…01) is an account set up long before this test.
select throws_ok($$ insert into auth.identities (provider_id, user_id, identity_data, provider)
    values ('google-writer', '00000000-0000-4000-8000-000000000001', '{"sub": "google-writer"}', 'google') $$,
  '23514', null, 'Google can''t join an existing account by its email on its own');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.expect_identity_link('google') $$, 'the person asks to connect Google in Settings');
select is((select count(*)::integer from public.identity_link_requests), 1,
  'allowed: identity_link_requests_select_own: a person reads their own request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.identity_link_requests), 0,
  'denied: identity_link_requests_select_own: nobody reads someone else''s');
select pg_temp.as_owner();
select lives_ok($$ insert into auth.identities (provider_id, user_id, identity_data, provider)
    values ('google-writer', '00000000-0000-4000-8000-000000000001', '{"sub": "google-writer"}', 'google') $$,
  'then Google joins the account');

/* ---------- 4. Telling the person ---------- */

select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'login_method_added'), 1,
  'the person is told a way to log in was connected');
select is((select count(*)::integer from public.email_outbox
           join public.notifications on notifications.id = any (email_outbox.notification_ids)
           where notifications.user_id = '00000000-0000-4000-8000-000000000001'
             and notifications.kind = 'login_method_added' and email_outbox.delivery = 'required'), 1,
  'and it is always emailed');
delete from auth.identities where provider_id = 'google-writer';
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'login_method_removed'), 1,
  'disconnecting is told too');

/* ---------- 5. What Settings lists ---------- */

select pg_temp.sign_in((select new_reader::text from accounts));
select is(public.my_login_methods() - 'passkeys',
  '{"outcome": "ok", "has_password": false, "providers": ["google"]}'::jsonb,
  'Settings lists Google and no password, never the Google email');

select * from finish();
rollback;
