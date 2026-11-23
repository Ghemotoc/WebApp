-- Database tests for "Set in", the countries a story takes place in (CALM-9, board D02, step 2 of
-- the new story wizard).
-- What it proves:
-- - a story is set nowhere by default, and only its writer sets the countries (another member
--   gets 'not_found', a visitor is refused, a bad code or a sixth country is refused);
-- - the codes are saved cleaned (capitals, once each, in order) and an empty list clears them;
-- - the column itself refuses more than five countries or anything that isn't a code.
-- No new table or policy: stories' policies are tested elsewhere; the setter checks the owner.
-- Personas: adult_writer (…01, the seed story's writer), teacher (…07, another member).
-- Test data: none added; every change is rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

/* ---------- 1. The default and who may set it ---------- */

select is((select set_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  '{}'::text[], 'a story is set in no country by default');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_story_set_in_countries('statia-meteo-seed01', array['RO']) ->> 'outcome',
  'not_found', 'another member can''t say where someone else''s story is set');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_story_set_in_countries('statia-meteo-seed01', array['RO']) $$,
  '42501', null, 'a visitor who isn''t signed in can''t set it');

/* ---------- 2. What the writer may save ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.set_my_story_set_in_countries('statia-meteo-seed01', array['Romania']) $$,
  '23514', null, 'something that isn''t a two-letter country code is refused');
select throws_ok(
  $$ select public.set_my_story_set_in_countries('statia-meteo-seed01', array['RO', 'MD', 'SE', 'NO', 'DK', 'FI']) $$,
  '23514', null, 'a sixth country is refused (board D02: up to five)');
select is(public.set_my_story_set_in_countries('statia-meteo-seed01', array['ro', ' md', 'RO']) ->> 'outcome',
  'ok', 'the writer says their story is set in Romania and Moldova');
select is((select set_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  array['MD', 'RO'], 'the codes are saved in capitals, once each, in order');
select is(public.set_my_story_set_in_countries('statia-meteo-seed01', '{}') ->> 'outcome',
  'ok', 'the writer clears it');
select is((select set_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  '{}'::text[], 'an empty list leaves the story set nowhere');
reset role;

/* ---------- 3. The column's own check ---------- */

select throws_ok(
  $$ update public.stories set set_in_countries = array['RO', 'MD', 'SE', 'NO', 'DK', 'FI']
     where id = '00000000-0000-4000-9000-000000000001' $$,
  '23514', null, 'the column refuses more than five countries even without the setter');

select * from finish();
rollback;
