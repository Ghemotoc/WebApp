-- Database tests for a writer's own details in their place on a character sheet (bundle GAPS-1;
-- CLAUDE.md rule 1).
-- What it proves:
-- - a writer adds a detail under a built-in group, in a group of their own and in neither, and
--   story_cast() says where each sits;
-- - a detail sits in one place: both a built-in and an own group, an unknown built-in group and an
--   empty name are refused;
-- - at most 12 groups of the writer's own, while a 13th detail in an existing group is fine;
-- - one name once in a place, capitals aside, while the same name in another place is fine; a
--   group that differs only in capitals is the same group (break test, 10 Nov 2026);
-- - a group is renamed on every detail in it, never onto another group's name (capitals aside),
--   though it may change its own capitals;
-- - another writer can't add or rename and a visitor can't call the functions.
-- Personas: adult_writer (…01, owns the seed story …9000-…01), teen_17 (…02).
-- Test data: details in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The SQLSTATE a statement raises, or null; with the hint when there is one.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return sqlstate || coalesce(':' || nullif(error_hint, ''), '');
end;
$$;
-- The seed story's address, and where story_cast() says a detail sits ("basics", "own:Magic" or
-- "nowhere").
create function pg_temp.slug() returns text language sql as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-000000000001';
$$;
create function pg_temp.place_of(detail_name text) returns text language sql as $$
  select coalesce(field ->> 'sheet_group', 'own:' || (field ->> 'own_group'), 'nowhere')
  from jsonb_array_elements(public.story_cast(pg_temp.slug()) -> 'fields') as field
  where field ->> 'name' = detail_name;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Adding a detail in a place ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is(public.add_character_detail(pg_temp.slug(), 'Blood type', 'basics', null) ->> 'outcome', 'ok',
  'a writer adds a detail under a built-in group');
select is(pg_temp.place_of('Blood type'), 'basics', 'story_cast() says it sits under Basics');
select is(public.add_character_detail(pg_temp.slug(), 'Wand', null, ' Magic ') ->> 'outcome', 'ok',
  'a writer adds a detail in a new group of their own');
select is(pg_temp.place_of('Wand'), 'own:Magic', 'story_cast() names the group, trimmed');
select public.add_character_detail(pg_temp.slug(), 'Lucky number', null, null);
select is(pg_temp.place_of('Lucky number'), 'nowhere', 'a detail with no place sits in neither');

/* ---------- 2. One place, a known group, a real name ---------- */

select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), 'Patronus', 'inside', 'Magic') $$),
  '23514:two_places', 'a detail in both a built-in and an own group is refused');
select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), 'Patronus', 'hobbies', null) $$),
  '23514', 'an unknown built-in group is refused');
select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), '   ', 'inside', null) $$),
  '23514', 'a detail with an empty name is refused');
select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), ' blood TYPE ', 'basics', null) $$),
  '23514:detail_name_taken', 'the same name twice in one place is refused, capitals aside');
select is(public.add_character_detail(pg_temp.slug(), 'Blood type', 'inside', null) ->> 'outcome', 'ok',
  'the same name in another place is fine');
select public.add_character_detail(pg_temp.slug(), 'Staff', null, 'MAGIC');
select is(pg_temp.place_of('Staff'), 'own:Magic',
  'a group that differs only in capitals is the same group, under the spelling it has');

/* ---------- 3. At most 12 groups of the writer's own ---------- */

select public.add_character_detail(pg_temp.slug(), 'Detail ' || number, null, 'Group ' || number)
from generate_series(2, 12) as number;
select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), 'One more', null, 'Group 13') $$),
  '23514:too_many_groups', 'a 13th group is refused');
select is(public.add_character_detail(pg_temp.slug(), 'Familiar', null, 'Magic') ->> 'outcome', 'ok',
  'another detail in an existing group is still added');
select is(pg_temp.refusal($$ select public.add_character_detail(pg_temp.slug(), 'familiar', null, 'magic') $$),
  '23514:detail_name_taken', 'the same name twice in a group of the writer''s own is refused');

/* ---------- 4. Renaming a group ---------- */

select is(public.rename_character_detail_group(pg_temp.slug(), 'Magic', 'Spellwork') ->> 'outcome', 'ok',
  'a writer renames a group of their own');
select is((select count(*)::integer from public.story_character_fields
           where story_id = '00000000-0000-4000-9000-000000000001' and own_group = 'Spellwork'), 3,
  'every detail in the group takes the new name');
select is(pg_temp.refusal($$ select public.rename_character_detail_group(pg_temp.slug(), 'Spellwork', 'Group 2') $$),
  '23514:name_taken', 'a group can''t take another group''s name');
select is(pg_temp.refusal($$ select public.rename_character_detail_group(pg_temp.slug(), 'Spellwork', 'GROUP 2') $$),
  '23514:name_taken', 'nor another group''s name in other capitals');
select is(public.rename_character_detail_group(pg_temp.slug(), 'Spellwork', 'SpellWork') ->> 'outcome', 'ok',
  'a group may change its own capitals');

/* ---------- 5. Nobody else ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  (public.add_character_detail(pg_temp.slug(), 'Mine now', 'basics', null) ->> 'outcome')
    || '/' || (public.rename_character_detail_group(pg_temp.slug(), 'SpellWork', 'Mine') ->> 'outcome'),
  'not_found/not_found', 'another writer can''t add a detail or rename a group in the story');

reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.add_character_detail('any-story', 'Detail', 'basics', null) $$),
  '42501', 'a visitor can''t add a detail');

select * from finish();
rollback;
