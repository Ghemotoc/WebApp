-- Database tests for profiles (story S1-E1-02).
-- Policy covered: profiles_select_own (allowed and denied, CLAUDE.md rule 1), plus the rule that
-- the user ID never changes (architecture 1.6).
-- How a persona is "signed in" here: switch to the authenticated role and set the JWT claims the
-- way Supabase does for a real request; auth.uid() then returns the persona's user ID.
-- Persona IDs are listed in supabase/README.md.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Sign in as adult_writer.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'allowed: profiles_select_own: adult_writer reads their own profile and only that one'
);

select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-4000-8000-000000000002' $$,
  'denied: profiles_select_own: adult_writer cannot read teen_17''s profile'
);

-- Writes are denied by default: there is no update policy, so nothing changes.
select is_empty(
  $$ update public.profiles set birth_year = 1950 returning id $$,
  'a signed-in user cannot change their own year of birth through the API'
);

-- Signed out: nothing at all.
reset role;
set local role anon;
select is_empty(
  $$ select id from public.profiles $$,
  'a signed-out visitor reads no profiles'
);

-- The user ID can never change, not even for the table's owner (architecture 1.6).
reset role;
select throws_ok(
  $$ update public.profiles set id = gen_random_uuid()
     where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'nobody can change a user ID'
);

select * from finish();

rollback;
