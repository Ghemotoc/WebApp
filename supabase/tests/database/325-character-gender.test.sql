-- Database tests for a character's gender, which picks family words such as mother and brother
-- (bundle GAPS-3; CLAUDE.md rule 1).
-- What it proves:
-- - a new character has no gender; the writer sets she, he or they and clears it again, and
--   story_cast() answers it;
-- - an unknown gender is refused, and another change leaves the gender as it was;
-- - what readers get of a character carries the gender too, so shared relationships read the same;
-- - another writer can't change it and a visitor can't call the function.
-- Personas: adult_writer (…01, owns the seed story …9000-…01), teen_17 (…02).
-- Test data: one character in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

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
-- The seed story's address, and the gender story_cast() answers for the test's character.
create function pg_temp.slug() returns text language sql as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-000000000001';
$$;
create function pg_temp.gender_in_cast() returns text language sql as $$
  select coalesce(character ->> 'gender', 'not set')
  from jsonb_array_elements(public.story_cast(pg_temp.slug()) -> 'characters') as character
  where character ->> 'name' = 'Gender test character';
$$;
create temp table made (character_id uuid);
grant select, insert on made to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Setting and clearing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

insert into made
select (public.create_story_character(pg_temp.slug(), 'Gender test character', 'supporting') ->> 'id')::uuid;

select is(pg_temp.gender_in_cast(), 'not set', 'a new character has no gender');
select is(public.update_story_character((select character_id from made), '{"gender": "she"}') ->> 'outcome', 'ok',
  'the writer sets a gender');
select is(pg_temp.gender_in_cast(), 'she', 'story_cast() answers the gender');
select public.update_story_character((select character_id from made), '{"gender": "they"}');
select is(pg_temp.gender_in_cast(), 'they', '"they" is a gender of its own');

/* ---------- 2. Unknown values and other changes ---------- */

select is(pg_temp.refusal(format(
    $sql$select public.update_story_character(%L, '{"gender": "robot"}')$sql$, (select character_id from made))),
  '23514', 'an unknown gender is refused');
select public.update_story_character((select character_id from made), '{"role": "minor"}');
select is(pg_temp.gender_in_cast(), 'they', 'another change leaves the gender as it was');
select public.update_story_character((select character_id from made), '{"gender": ""}');
select is(pg_temp.gender_in_cast(), 'not set', 'an empty gender clears it');

/* ---------- 3. What readers get ---------- */

select public.update_story_character((select character_id from made), '{"gender": "he"}');
reset role;
select is((select public.public_character_json(story_characters, false, false) ->> 'gender'
           from public.story_characters where id = (select character_id from made)),
  'he', 'what readers get of a character carries the gender');

/* ---------- 4. Nobody else ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.update_story_character((select character_id from made), '{"gender": "she"}') ->> 'outcome',
  'not_found', 'another writer can''t change the gender');

select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select is(pg_temp.refusal(format(
    $sql$select public.update_story_character(%L, '{"gender": "she"}')$sql$, (select character_id from made))),
  '42501', 'a visitor can''t call the function');

select * from finish();
rollback;
