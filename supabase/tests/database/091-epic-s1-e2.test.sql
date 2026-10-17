-- Epic check for S1-E2, Accounts, age gate and onboarding (story S1-E2-QA).
-- It adds no feature: it walks the epic's main journey through the database, crossing every March
-- story of the epic, and checks the seed personas the story names against the epic's rules.
-- Journey (S1-E14-01 × S1-E2-01 × S1-E2-02 × S1-E2-10 × S1-E2-04 × S1-E2-05):
--   an invited adult from Romania signs up with a year of birth and the current terms → the
--   profile has the year, the country and the two consents, and the invite lost a place → until
--   the email is confirmed the account is read-only → confirmed but without a username it is still
--   read-only → with a username it is an active member → wrong log-in tries pause and a log-in
--   clears them.
-- Personas (S1-E2-02 × S1-E2-04 × S1-E2-07a): adult_writer is active; teen_17, kid_14_ok and
--   kid_14_waiting stay read-only while adults_only is on (minors are seed data in March); the
--   moderator persona is a staff account, read-only as a member, and only owner and admin manage
--   roles. Nobody reads another person's profile.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- The country token's secret, as set by hand on staging (inside this transaction only).
select vault.create_secret('epic-check-secret', 'signup_context_secret')
  where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
select vault.update_secret(id, 'epic-check-secret') from vault.secrets where name = 'signup_context_secret';

create function pg_temp.sign_up_data(birth_year text) returns jsonb language sql as $$
  select jsonb_build_object(
    'invite_code', 'PERSONAS-TEST-INVITE', 'birth_year', birth_year, 'locale', 'ro',
    'signup_context', 'v1.RO.' || extract(epoch from now())::bigint || '.'
      || encode(extensions.hmac('v1.RO.' || extract(epoch from now())::bigint, 'epic-check-secret', 'sha256'), 'hex'),
    'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'ro'),
    'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'ro'));
$$;

-- The new account's user ID, kept once it exists (a member can't read auth.users).
create temp table new_account (id uuid);
grant select on new_account to authenticated;
create function pg_temp.new_account_id() returns uuid language sql as $$
  select id from new_account;
$$;

-- 1. Sign-up (S1-E14-01, S1-E2-01, S1-E2-02, S1-E2-10).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'epic.writer@example.com', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
  pg_temp.sign_up_data((extract(year from now())::integer - 30)::text), now(), now(), '', '', '', '');
insert into new_account select id from auth.users where email = 'epic.writer@example.com';

select results_eq(
  $$ select birth_year::integer, birth_month, country_code, locale, handle from public.profiles where id = pg_temp.new_account_id() $$,
  $$ select extract(year from now())::integer - 30, null::smallint, 'RO', 'ro', null::text $$,
  'the profile keeps the year only, the country code from the connection and the language; no username yet'
);
select is((select count(*)::integer from public.consents where user_id = pg_temp.new_account_id()), 2,
  'the accepted terms and privacy notice are recorded');
select is((select use_count from public.invites where code_hash = public.invite_code_hash('PERSONAS-TEST-INVITE')), 1,
  'the invite lost one place');

-- 2. The account gate, step by step (S1-E2-01, S1-E2-04).
select is(public.account_state(pg_temp.new_account_id())::text, 'email_unconfirmed', 'read-only until the email is confirmed');
update auth.users set email_confirmed_at = now() where id = pg_temp.new_account_id();
select is(public.account_state(pg_temp.new_account_id())::text, 'handle_missing', 'confirmed, but read-only until a username is chosen');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.new_account_id(), 'role', 'authenticated')::text, true);
select is(public.check_handle('admin'), 'looks_like_staff', 'a staff-like username is refused in setup');
select is(public.set_my_handle('epic.writer'), 'ok', 'the person chooses a username');
select is(public.set_my_pen_name('Scriitoarea Epică'), 'ok', 'and a pen name');
select ok(public.is_active_member(), 'with a username, the invited adult is an active member (adults_only, March)');
select is_empty($$ select id from public.profiles where id <> (select auth.uid()) $$,
  'they read nobody else''s profile');

-- 3. Logging in (S1-E2-05).
reset role;
select is(
  (select count(*)::integer from generate_series(1, 5) where public.record_sign_in_failure(public.hash_email('epic.writer@example.com')) is not null),
  1, 'five wrong tries pause logging in'
);
set local role authenticated;
select lives_ok($$ select public.clear_my_sign_in_failures() $$, 'a successful log-in clears the tries');
reset role;
select is(public.sign_in_pause_until(public.hash_email('epic.writer@example.com')), null, 'and the pause is gone');

-- 4. The personas the story names (S1-E2-02 × S1-E2-04 × S1-E2-07a).
select is(public.account_state('00000000-0000-4000-8000-000000000001')::text, 'active', 'adult_writer is active');
select is(public.account_state('00000000-0000-4000-8000-000000000002')::text, 'minor_not_admitted',
  'teen_17 is read-only while adults_only is on');
select is(public.account_state('00000000-0000-4000-8000-000000000003')::text, 'minor_not_admitted',
  'kid_14_ok is read-only while adults_only is on');
select is(public.account_state('00000000-0000-4000-8000-000000000004')::text, 'minor_not_admitted',
  'kid_14_waiting is read-only while adults_only is on');
select is(public.account_state('00000000-0000-4000-8000-000000000010')::text, 'staff_account',
  'the moderator persona is a staff account, read-only as a member');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is_empty($$ select id from public.profiles where id <> (select auth.uid()) $$,
  'teen_17 reads nobody else''s profile');
select throws_ok($$ select public.admin_list_staff() $$, '42501', null, 'a member can''t see the staff list');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}', true);
select throws_ok($$ select public.admin_grant_role('00000000-0000-4000-8000-000000000001', 'support', 'Help') $$,
  '42501', null, 'a moderator can''t grant roles');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}', true);
select isnt_empty($$ select * from public.admin_list_staff() $$, 'an admin sees the staff list');

select * from finish();

rollback;
