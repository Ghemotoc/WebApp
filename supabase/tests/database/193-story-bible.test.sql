-- Database tests for the story bible in Story Atlas (stories S1-E17-17 and S1-E17-18; CLAUDE.md
-- rules 1, 8 and 15).
-- What it proves:
-- - every plan starts with the seven default sections, new stories and old ones alike (S1-E17-17);
-- - sections are added, renamed (an empty name gives a default one its name back), moved to any
--   place with the others shifting, and deleted only when empty;
-- - entries are made in a section, change by themselves (title, tags, text, section), move only
--   within their own story, refuse raw HTML and script links, and are deleted (S1-E17-18);
-- - policies story_bible_sections_select_own and story_bible_entries_select_own: allowed (the
--   writer) and denied (another member, a moderator);
-- - a purged story takes its sections and entries with it; no user ID in any answer.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member and writes
-- a story of their own; moderator (…10) is staff. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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
-- The bible's section keys in order: the preset, or the writer's own name.
create function pg_temp.section_order() returns text language sql as $$
  select string_agg(coalesce(nullif(section ->> 'name', ''), section ->> 'preset'), ',' order by (section ->> 'position')::integer)
  from jsonb_array_elements(public.story_bible('statia-meteo-seed01') -> 'sections') as section;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- teacher's story, made now, so it gets its sections through the trigger.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating)
values ('19300000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 't193-alta',
  'Alta', 'Alta.', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages');

/* ---------- 1. The default sections (S1-E17-17) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.section_order(), 'premise,world,magic,cosmology,factions,history,glossary',
  'allowed: story_bible_sections_select_own: a seeded story''s plan has the seven default sections in order');
reset role;
select is((select count(*)::integer from public.story_bible_sections
           where story_id = '19300000-0000-4000-8000-000000000001'), 7,
  'a story made now gets the seven default sections too');

/* ---------- 2. Changing sections ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values ('creatures', (public.add_bible_section('statia-meteo-seed01', ' Creaturi ') ->> 'id')::uuid);
select is(pg_temp.section_order(), 'premise,world,magic,cosmology,factions,history,glossary,Creaturi',
  'a new section goes at the end, its name trimmed');
select is(pg_temp.refusal($$ select public.add_bible_section('statia-meteo-seed01', '  ') $$), '23514',
  'a section of the writer''s own needs a name');

insert into named select 'world', id from public.story_bible_sections
  where preset = 'world' and story_id = '00000000-0000-4000-9000-000000000001';
select public.rename_bible_section((select id from named where label = 'world'), 'Orașul');
select is(pg_temp.section_order(), 'premise,Orașul,magic,cosmology,factions,history,glossary,Creaturi',
  'renaming a default section stores the writer''s name');
select public.rename_bible_section((select id from named where label = 'world'), '');
select is(pg_temp.section_order(), 'premise,world,magic,cosmology,factions,history,glossary,Creaturi',
  'an empty name gives a default section its default name back');
select is(pg_temp.refusal($$ select public.rename_bible_section((select id from named where label = 'creatures'), '') $$),
  '23514', 'a section of the writer''s own can''t lose its name');

select public.move_bible_section((select id from named where label = 'creatures'), 2);
select is(pg_temp.section_order(), 'premise,Creaturi,world,magic,cosmology,factions,history,glossary',
  'moving a section earlier shifts the ones in between down');
select public.move_bible_section((select id from named where label = 'creatures'), 99);
select is(pg_temp.section_order(), 'premise,world,magic,cosmology,factions,history,glossary,Creaturi',
  'moving past the end puts it last, the others shifting up');

/* ---------- 3. Entries (S1-E17-18) ---------- */

insert into named values ('harbour', (public.create_bible_entry((select id from named where label = 'world'), ' Portul vechi ') ->> 'id')::uuid);
select is(public.update_bible_entry((select id from named where label = 'harbour'),
  jsonb_build_object('tags', jsonb_build_array(' oraș ', 'nord', 'oraș', ''),
    'body', 'Portul are **trei** faruri. Vezi [harta](https://example.com/harta).')) ->> 'outcome', 'ok',
  'an entry''s tags and text save');
select is((public.story_bible('statia-meteo-seed01') -> 'entries' -> 0) - 'id' - 'updated_at' - 'section_id',
  jsonb_build_object('title', 'Portul vechi', 'tags', jsonb_build_array('oraș', 'nord'),
    'body', 'Portul are **trei** faruri. Vezi [harta](https://example.com/harta).'),
  'allowed: story_bible_entries_select_own: story_bible() returns the entry, its title trimmed and its tags cleaned');
select is(pg_temp.refusal($$ select public.update_bible_entry((select id from named where label = 'harbour'),
  '{"body": "<script>alert(1)</script>"}') $$), '23514:html', 'raw HTML in an entry is refused (rule 8)');
select is(pg_temp.refusal($$ select public.update_bible_entry((select id from named where label = 'harbour'),
  '{"body": "[click](javascript:alert(1))"}') $$), '23514:script_link', 'a script link in an entry is refused (rule 8)');
select is(pg_temp.refusal($$ select public.update_bible_entry((select id from named where label = 'harbour'),
  '{"colour": "red"}') $$), '23514:unknown_change', 'an unknown change is refused');

select public.update_bible_entry((select id from named where label = 'harbour'),
  jsonb_build_object('section_id', (select id from named where label = 'creatures')));
select is((select section_id from public.story_bible_entries where id = (select id from named where label = 'harbour')),
  (select id from named where label = 'creatures'), 'an entry moves to another section of its story');
select is(public.delete_bible_section((select id from named where label = 'creatures')) ->> 'outcome', 'not_empty',
  'a section with entries can''t be deleted');

/* ---------- 4. Other people ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_bible_entries where story_id = '00000000-0000-4000-9000-000000000001')
  + (select count(*)::integer from public.story_bible_sections where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'denied: story_bible_sections_select_own and story_bible_entries_select_own: another member reads nothing of the bible');
select is(public.update_bible_entry((select id from named where label = 'harbour'), '{"title": "Al meu"}') ->> 'outcome',
  'not_found', 'another member can''t change the writer''s entry');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.story_bible_entries), 0,
  'denied: story_bible_entries_select_own: a moderator reads no bible entries through the app');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal(format($$ select public.update_bible_entry(%L, jsonb_build_object('section_id', %L)) $$,
  (select id from named where label = 'harbour'),
  (select id from public.story_bible_sections where story_id = '19300000-0000-4000-8000-000000000001' and position = 1))),
  '23514:other_story', 'an entry can''t move to a section of another writer''s story');

/* ---------- 5. Deleting ---------- */

select public.delete_bible_entry((select id from named where label = 'harbour'));
select is(public.delete_bible_section((select id from named where label = 'creatures')) ->> 'outcome', 'ok',
  'once empty, the section is deleted');
select is(pg_temp.section_order(), 'premise,world,magic,cosmology,factions,history,glossary',
  'deleting the entry and then its section leaves the defaults in order');
select ok(public.story_bible('statia-meteo-seed01')::text !~ '00000000-0000-4000-8000-000000000001',
  'story_bible() never carries the writer''s user ID (rule 15)');

reset role;
delete from public.stories where id = '19300000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.story_bible_sections where story_id = '19300000-0000-4000-8000-000000000001'), 0,
  'a purged story takes its bible sections with it');

select * from finish();

rollback;
