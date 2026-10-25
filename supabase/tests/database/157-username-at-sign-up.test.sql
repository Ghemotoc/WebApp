-- Database tests for choosing the username on the sign-up form (Robert, 25 Oct 2026; follows
-- S1-E2-04; bundle PEOPLE-3).
-- What it proves:
-- - a sign-up with a free username creates the profile with that username and its forms;
-- - a taken, look-alike, reserved or too-short username refuses the whole sign-up: no account and
--   no profile are left;
-- - a sign-up without a username still works and leaves it for /setup;
-- - a visitor can ask check_handle() before signing up, and its answer never names anyone.
-- How a sign-up is simulated: an insert into auth.users, as in 023.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- The sign-up data the form sends, with a username (or none).
create function pg_temp.sign_up_data(handle text) returns jsonb language sql as $$
  select jsonb_build_object(
    'invite_code', 'PERSONAS-TEST-INVITE',
    'birth_year', '1990',
    'locale', 'en',
    'handle', handle,
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')
  );
$$;
-- Inserts an account the way Supabase Auth does; returns its user ID.
create function pg_temp.sign_up(email text, sign_up_data jsonb) returns uuid language sql as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    email, 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}', sign_up_data,
    now(), now(), '', '', '', ''
  )
  returning id;
$$;

/* ---------- 1. A free username ---------- */

select lives_ok($$ select pg_temp.sign_up('lia@example.com', pg_temp.sign_up_data('lia.writes')) $$,
  'a sign-up with a free username goes through');
select results_eq(
  $$ select profiles.handle, profiles.handle_slug from public.profiles
     join auth.users on users.id = profiles.id where users.email = 'lia@example.com' $$,
  $$ values ('lia.writes'::text, public.name_slug('lia.writes')) $$,
  'the profile has the username and its web-address form from the start');

/* ---------- 2. A username the rules refuse ---------- */

select throws_ok($$ select pg_temp.sign_up('copy@example.com', pg_temp.sign_up_data('adult_writer')) $$,
  '23514', null, 'a taken username refuses the sign-up');
select throws_ok($$ select pg_temp.sign_up('lookalike@example.com', pg_temp.sign_up_data('ADULT_WRlTER')) $$,
  '23514', null, 'and so does a look-alike of a taken one');
select throws_ok($$ select pg_temp.sign_up('short@example.com', pg_temp.sign_up_data('ab')) $$,
  '23514', null, 'and a username that is too short');
select throws_ok($$ select pg_temp.sign_up('staff@example.com', pg_temp.sign_up_data('admin')) $$,
  '23514', null, 'and one that looks like staff');
select is((select count(*)::integer from auth.users
           where email in ('copy@example.com', 'lookalike@example.com', 'short@example.com', 'staff@example.com')), 0,
  'a refused username leaves no account behind');

/* ---------- 3. No username, and the visitor's check ---------- */

select lives_ok($$ select pg_temp.sign_up('later@example.com', pg_temp.sign_up_data(null)) $$,
  'a sign-up without a username still works');
select is((select profiles.handle from public.profiles join auth.users on users.id = profiles.id
           where users.email = 'later@example.com'), null,
  'and leaves the username for setup');

select set_config('role', 'anon', true);
select results_eq($$ select public.check_handle('adult_writer'), public.check_handle('free.name.here') $$,
  $$ values ('taken'::text, 'ok'::text) $$,
  'a visitor can check a username before signing up, and hears only taken or free');

select * from finish();
rollback;
