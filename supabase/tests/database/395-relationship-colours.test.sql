-- Database tests for the colours a writer picks for the relationship categories (CALM-9, board
-- E25; the 23 Nov 2026 canvas changes approved by Robert at 08:33 UTC).
-- What it proves:
-- - a story starts with no colours picked: story_cast returns an empty map;
-- - the writer saves a colour for one category, and a second pick adds to the map instead of
--   replacing it; picking again for the same category changes only that one;
-- - story_cast returns the saved map to the writer;
-- - another member gets 'not_found' and changes nothing; a visitor is refused;
-- - an unknown category or swatch is refused by the column's check.
-- No new table or policy: story_plans' policies are tested in 190; the function checks the owner
-- itself through my_live_story_id().
-- Personas: adult_writer (…01, the seed story's writer), teacher (…07, another member).
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

-- Step 1: the writer's story starts with every category on its default colour.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.story_cast('statia-meteo-seed01') -> 'relationship_colours', '{}'::jsonb,
  'a story starts with no relationship colours picked');

-- Step 2: the writer picks colours; each pick adds to the map.
select is(public.set_relationship_colour('statia-meteo-seed01', 'family', 'green'),
  '{"outcome": "ok", "relationship_colours": {"family": "green"}}'::jsonb,
  'the writer saves a colour for one category');
select is(public.set_relationship_colour('statia-meteo-seed01', 'conflict', 'red') -> 'relationship_colours',
  '{"family": "green", "conflict": "red"}'::jsonb,
  'a second category is added to the map, the first one stays');
select is(public.set_relationship_colour('statia-meteo-seed01', 'family', 'violet') -> 'relationship_colours',
  '{"family": "violet", "conflict": "red"}'::jsonb,
  'picking again changes only that category');
select is(public.story_cast('statia-meteo-seed01') -> 'relationship_colours',
  '{"family": "violet", "conflict": "red"}'::jsonb,
  'story_cast returns the colours the writer picked');

-- Step 3: an unknown category or swatch is refused.
select throws_ok($$ select public.set_relationship_colour('statia-meteo-seed01', 'rivals', 'red') $$,
  '23514', null, 'an unknown category is refused');
select throws_ok($$ select public.set_relationship_colour('statia-meteo-seed01', 'love', 'teal') $$,
  '23514', null, 'an unknown swatch is refused');

-- Step 4: another member can't change the writer's colours.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_relationship_colour('statia-meteo-seed01', 'love', 'blue'),
  '{"outcome": "not_found"}'::jsonb, 'another member gets not_found');

-- Step 5: a visitor is refused.
select pg_temp.sign_out();
select throws_ok($$ select public.set_relationship_colour('statia-meteo-seed01', 'love', 'blue') $$,
  '42501', null, 'a visitor is refused');

-- Step 6: the other member's attempt changed nothing.
reset role;
select is((select relationship_colours from public.story_plans
           where story_id = '00000000-0000-4000-9000-000000000001'),
  '{"family": "violet", "conflict": "red"}'::jsonb, 'nobody but the writer changed the map');

select * from finish();
rollback;
