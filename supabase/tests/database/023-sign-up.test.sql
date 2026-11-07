-- Database tests for sign-up (story S1-E2-01): the trigger on auth.users.
-- What it proves:
-- - a sign-up with a working invite, a year of birth and the current legal versions creates the
--   profile (its id is the Supabase Auth user ID) and two consent records with the time;
-- - the invite loses one place in the same transaction, and two people can't both take the last;
-- - any refusal (no invite, an ended invite, no year of birth, out-of-date terms) keeps nothing:
--   no auth.users row, no profile, no consent;
-- - until the email is confirmed the account can read but not write (email_unconfirmed);
-- - nobody gets a staff role by signing up.
-- How a sign-up is simulated: an insert into auth.users with the sign-up data in
-- raw_user_meta_data, exactly as Supabase Auth inserts it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- The invite-only test with the waiting list off (WAITLIST-1 is tested in 310): without a code,
-- sign-up is refused, as before the list.
update public.feature_flags set is_enabled = false where key = 'waitlist';

-- The sign-up data the form sends, with the current version 0.1 in English.
create function pg_temp.sign_up_data(invite_code text, birth_year text default '1990')
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'invite_code', invite_code,
    'birth_year', birth_year,
    'locale', 'en',
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
create function pg_temp.sign_up(email text, sign_up_data jsonb)
returns uuid
language sql
as $$
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

-- 1. A good sign-up.
select lives_ok(
  $$ select pg_temp.sign_up('new.writer@example.com', pg_temp.sign_up_data('PERSONAS-TEST-INVITE')) $$,
  'an invited adult signs up with an invite code, a year of birth and the current terms'
);

select results_eq(
  $$ select profiles.id = users.id, profiles.birth_year::integer, profiles.locale
     from public.profiles join auth.users on users.id = profiles.id
     where users.email = 'new.writer@example.com' $$,
  $$ values (true, 1990, 'en') $$,
  'the profile''s id is the Supabase Auth user ID, with the year of birth and the chosen language'
);

select results_eq(
  $$ select documents.slug, consents.method, consents.accepted_at is not null
     from public.consents
     join public.legal_document_versions as versions on versions.id = consents.legal_document_version_id
     join public.legal_documents as documents on documents.id = versions.document_id
     join auth.users on users.id = consents.user_id
     where users.email = 'new.writer@example.com' order by 1 $$,
  $$ values ('privacy', 'sign_up', true), ('terms', 'sign_up', true) $$,
  'the accepted terms and privacy notice versions are stored with the time'
);

select is(
  (select use_count from public.invites where code_hash = public.invite_code_hash('PERSONAS-TEST-INVITE')),
  1,
  'the invite lost one place in the same transaction'
);

select is(
  public.account_state((select id from auth.users where email = 'new.writer@example.com'))::text,
  'email_unconfirmed',
  'until the email is confirmed the new account can read but not publish, comment, post or message'
);

select is_empty(
  $$ select staff_roles.id from public.staff_roles
     join auth.users on users.id = staff_roles.user_id where users.email = 'new.writer@example.com' $$,
  'signing up never gives a staff role'
);

-- 2. Refusals keep nothing.
select throws_ok(
  $$ select pg_temp.sign_up('no.code@example.com', pg_temp.sign_up_data(null)) $$,
  '23514',
  null,
  'without an invite code, sign-up is refused while invite_only is on'
);
select throws_ok(
  $$ select pg_temp.sign_up('ended@example.com', pg_temp.sign_up_data('EXPIRED-TEST-INVITE')) $$,
  '23514',
  null,
  'an expired invite is refused'
);
select throws_ok(
  $$ select pg_temp.sign_up('no.year@example.com', pg_temp.sign_up_data('PERSONAS-TEST-INVITE', null)) $$,
  '23514',
  null,
  'a sign-up without a year of birth is refused'
);
select throws_ok(
  $$ select pg_temp.sign_up('old.terms@example.com',
       pg_temp.sign_up_data('PERSONAS-TEST-INVITE') || '{"accepted_terms_version_id": "not-a-version"}') $$,
  '23514',
  null,
  'a sign-up that did not accept the current terms is refused'
);
select is_empty(
  $$ select id from auth.users
     where email in ('no.code@example.com', 'ended@example.com', 'no.year@example.com', 'old.terms@example.com') $$,
  'a refused sign-up keeps nothing: no account, no profile, no consent'
);

-- 3. The last place goes to one person only.
update public.invites set max_uses = 2, use_count = 1
  where code_hash = public.invite_code_hash('EXPIRED-TEST-INVITE');
update public.invites set expires_at = now() + interval '1 day'
  where code_hash = public.invite_code_hash('EXPIRED-TEST-INVITE');
select lives_ok(
  $$ select pg_temp.sign_up('last.place@example.com', pg_temp.sign_up_data('EXPIRED-TEST-INVITE')) $$,
  'the first person takes the last place'
);
select throws_ok(
  $$ select pg_temp.sign_up('too.late@example.com', pg_temp.sign_up_data('EXPIRED-TEST-INVITE')) $$,
  '23514',
  null,
  'the second person is refused: two people can''t both use the last place'
);

-- 4. With invite_only off (after March), no code is needed. Sign-up is then public, so the market
-- rules apply (S1-E2-10): the person signs up from Romania with a signed country token.
update public.feature_flags set is_enabled = false where key = 'invite_only';
select vault.create_secret('test-signup-secret', 'signup_context_secret')
  where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
select vault.update_secret(id, 'test-signup-secret') from vault.secrets where name = 'signup_context_secret';
select lives_ok(
  $$ select pg_temp.sign_up('open.sign.up@example.com', pg_temp.sign_up_data(null) || jsonb_build_object('signup_context',
       'v1.RO.' || extract(epoch from now())::bigint || '.' || encode(extensions.hmac('v1.RO.' || extract(epoch from now())::bigint, 'test-signup-secret', 'sha256'), 'hex'))) $$,
  'with invite_only off, sign-up needs no invite'
);

select * from finish();

rollback;
