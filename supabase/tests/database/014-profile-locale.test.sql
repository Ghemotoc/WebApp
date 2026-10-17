-- Database tests for the interface language on the account (story S1-E1-04).
-- What it proves: every account starts in Romanian; a signed-in person reads and changes only
-- their own language (allowed and denied, CLAUDE.md rule 1); signed-out visitors and unsupported
-- codes are refused; the API still can't change any other profile column.
-- How a persona is "signed in": the authenticated role plus the JWT claims, as in
-- 010-profiles.test.sql. Persona IDs are listed in supabase/README.md.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- Every seeded account starts in Romanian (decided 17 Oct 2026, 11:48).
select is_empty(
  $$ select id from public.profiles where locale <> 'ro' $$,
  'every account starts with Romanian as its interface language'
);

-- Sign in as adult_writer.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select locale from public.profiles),
  'ro',
  'allowed: profiles_select_own: adult_writer reads their own interface language'
);

select is(
  public.set_my_locale('en'),
  'en',
  'adult_writer saves English as their interface language'
);

select is(
  (select locale from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  'en',
  'the saved language is what adult_writer reads back on their next device'
);

select is_empty(
  $$ select locale from public.profiles where id = '00000000-0000-4000-8000-000000000002' $$,
  'denied: profiles_select_own: adult_writer cannot read teen_17''s interface language'
);

select throws_ok(
  $$ select public.set_my_locale('fr') $$,
  '22023',
  null,
  'a language that is not ro or en is refused'
);

-- A read-only account (waiting for a parent's consent) can still choose its language.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(
  public.set_my_locale('en'),
  'en',
  'kid_14_waiting, who is read-only, can still save their interface language'
);

-- Signed out: no account to save to, and the function isn't even callable.
reset role;
set local role anon;
select throws_ok(
  $$ select public.set_my_locale('en') $$,
  '42501',
  null,
  'a signed-out visitor cannot save a language to any account'
);

-- Saving one person's language never touches anyone else's, and the API still can't change the
-- year of birth (there is still no update policy on profiles).
reset role;
select is(
  (select locale from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
  'ro',
  'teen_17''s language is unchanged by other people saving theirs'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ update public.profiles set birth_year = 1950 returning id $$,
  '42501',
  null,
  'saving a language did not open other profile columns to changes through the API (no update grant)'
);

select * from finish();

rollback;
