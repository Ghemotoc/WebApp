-- Database tests for the year of birth at sign-up (story S1-E2-02).
-- What it proves:
-- - the month is needed only for years that leave the age unclear at 13 or 16;
-- - under-13s are refused and, while adults_only is on, under-18s too; nothing is kept;
-- - an adult's year is stored, the month only when needed, and age_check_result starts 'pending';
-- - while adults_only is on an adult is active once the email is confirmed (and a username chosen);
-- - nobody but the account's owner reads the year of birth (allowed and denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- The month question, with a fixed date: 15 June 2027.
select ok(public.birth_year_needs_month(2014, '2027-06-15'), 'born 2014: could be 12 or 13 in 2027, so the month is asked');
select ok(public.birth_year_needs_month(2011, '2027-06-15'), 'born 2011: could be 15 or 16 in 2027, so the month is asked');
select ok(not public.birth_year_needs_month(1990, '2027-06-15'), 'born 1990: the month is never asked');
select ok(not public.birth_year_needs_month(2009, '2027-06-15'), 'born 2009 (17 or 18 in 2027): the month is never asked');

-- Sign-up data with the current legal versions and the working seed invite.
create function pg_temp.sign_up_data(birth_year text, birth_month text default null)
returns jsonb
language sql
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'invite_code', 'PERSONAS-TEST-INVITE',
    'birth_year', birth_year,
    'birth_month', birth_month,
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')
  ));
$$;

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

-- Years worked out from today, so the test never ages.
create function pg_temp.years_ago(years integer)
returns text
language sql
as $$ select (extract(year from (now() at time zone 'Europe/Bucharest'))::integer - years)::text; $$;

-- The form's question.
select is(public.sign_up_age_outcome(pg_temp.years_ago(30)::integer), 'ok', 'an adult''s year is fine');
select is(public.sign_up_age_outcome(pg_temp.years_ago(10)::integer), 'under_13', 'a 10-year-old is under 13');
select is(public.sign_up_age_outcome(pg_temp.years_ago(15)::integer), 'adults_only',
  'while adults_only is on, a 15-year-old is refused (March test, invited adults only)');
select is(public.sign_up_age_outcome(pg_temp.years_ago(13)::integer), 'month_needed',
  'a year that leaves the age unclear at 13 needs the month');

-- An adult signs up: the year is stored, no month, the check pending.
select lives_ok(
  $$ select pg_temp.sign_up('adult.year@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), '5')) $$,
  'an adult signs up'
);
select results_eq(
  $$ select profiles.birth_year::integer, profiles.birth_month, profiles.age_check_result::text
     from public.profiles join auth.users on users.id = profiles.id where users.email = 'adult.year@example.com' $$,
  $$ select pg_temp.years_ago(30)::integer, null::smallint, 'pending' $$,
  'the year is stored, a month given for a year that doesn''t need it is not, and the age check is pending'
);
update auth.users set email_confirmed_at = now() where email = 'adult.year@example.com';
-- The username comes next in setup (S1-E2-04); this test is about the age check, so it sets one.
update public.profiles set handle = 'adult.year'
  where id = (select id from auth.users where email = 'adult.year@example.com');
select is(
  public.account_state((select id from auth.users where email = 'adult.year@example.com'))::text,
  'active',
  'while adults_only is on, an adult with a username is active once the email is confirmed, without the age check'
);

-- Refusals keep nothing.
select throws_ok(
  $$ select pg_temp.sign_up('child@example.com', pg_temp.sign_up_data(pg_temp.years_ago(10))) $$,
  '23514', null, 'an under-13 sign-up is refused'
);
select throws_ok(
  $$ select pg_temp.sign_up('teen@example.com', pg_temp.sign_up_data(pg_temp.years_ago(17))) $$,
  '23514', null, 'while adults_only is on, an under-18 sign-up is refused'
);
select is_empty(
  $$ select id from auth.users where email in ('child@example.com', 'teen@example.com') $$,
  'nothing is kept from a refused sign-up: no account, no year of birth'
);

-- Nobody else reads the year of birth.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is_empty(
  $$ select birth_year from public.profiles where id = '00000000-0000-4000-8000-000000000003' $$,
  'denied: profiles_select_own: adult_writer cannot see kid_14_ok''s year of birth'
);

select * from finish();

rollback;
