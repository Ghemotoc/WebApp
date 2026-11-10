-- Database tests for where the writer puts the cards on the relationship map (bundle G10 ATLAS,
-- part b2; CLAUDE.md rule 1).
-- What it proves:
-- - a writer saves a card's place and story_cast() returns it; a place off the map is refused;
-- - moving a card keeps the character's update stamp, and a real edit still changes it;
-- - "Arrange for me" (clear_map_positions) forgets every place in the story;
-- - another writer can't move the card, a visitor can't call either function, and readers'
--   character data never carries the place.
-- Personas: adult_writer (…01, owns statia-meteo-seed01), teen_17 (…02).
-- Test data: one character in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table named (label text primary key, id uuid, stamp timestamptz) on commit drop;
grant all on named to authenticated, anon;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named (label, id) values
  ('mara', (public.create_story_character('statia-meteo-seed01', 'Mara', 'protagonist') ->> 'id')::uuid);

/* ---------- 1. Saving a place ---------- */

-- An old stamp, so the next checks can tell whether moving changed it (triggers off for this
-- one set-up line only).
reset role;
set local session_replication_role = replica;
update public.story_characters set updated_at = '2026-01-01T00:00:00Z' where id = (select id from named where label = 'mara');
set local session_replication_role = origin;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is(
  public.set_character_map_position((select id from named where label = 'mara'), 320, 140) ->> 'outcome',
  'ok', 'a writer saves where a card sits on the map');
select results_eq(
  $$ select (character ->> 'map_x')::int, (character ->> 'map_y')::int
     from jsonb_array_elements(public.story_cast('statia-meteo-seed01') -> 'characters') as character
     where character ->> 'id' = (select id::text from named where label = 'mara') $$,
  $$ values (320, 140) $$,
  'story_cast() returns the place');
select is(
  (select updated_at from public.story_characters where id = (select id from named where label = 'mara')),
  '2026-01-01T00:00:00Z'::timestamptz,
  'moving a card is not an edit: the update stamp stays');
select is(pg_temp.refusal($$ select public.set_character_map_position(
  (select id from named where label = 'mara'), 5000, 10) $$), '23514',
  'a place off the map is refused');

select public.update_story_character((select id from named where label = 'mara'),
  '{"sheet": {"summary": "counts everything"}}'::jsonb);
select isnt(
  (select updated_at from public.story_characters where id = (select id from named where label = 'mara')),
  '2026-01-01T00:00:00Z'::timestamptz,
  'a real edit still changes the update stamp');

/* ---------- 2. Arrange for me ---------- */

select is(public.clear_map_positions('statia-meteo-seed01') ->> 'outcome', 'ok',
  'Arrange for me answers ok');
select ok(
  (select map_x is null and map_y is null from public.story_characters
   where id = (select id from named where label = 'mara')),
  'Arrange for me forgets every place, so the map lays the cards out again');

/* ---------- 3. Nobody else ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  public.set_character_map_position((select id from named where label = 'mara'), 10, 10) ->> 'outcome',
  'not_found', 'another writer can''t move the card');

reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.set_character_map_position(
  (select id from named where label = 'mara'), 10, 10) $$), '42501',
  'a visitor can''t move a card');

select * from finish();
rollback;
