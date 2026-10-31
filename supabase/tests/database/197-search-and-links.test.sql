-- Database tests for search, [[Name]] cross-links and "Mentioned in" in Story Atlas (stories
-- S1-E17-30, S1-E17-31 and S1-E17-12; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - search_story() finds characters (sheet and the writer's own fields too), bible entries,
--   chapters (the manuscript), scenes (with their chapter), ideas, events and marketing notes,
--   ignoring capitals and accents, grouped by type, with a snippet cut around the match;
-- - a query under two letters finds nothing; at most 20 results of one type;
-- - story_link_targets() lists characters by name and every alias, entries and titled chapters;
-- - character_mentions() finds [[the name]] or [[an alias]] in any capitals, in entries,
--   chapters, ideas and other characters, never the character's own sheet;
-- - another member gets not_found, a signed-out visitor nothing; no user ID in any answer.
-- No new tables, so no new policies: the functions read through the earlier parts' tables.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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
-- The results of one search as kind:title pairs, in order.
create function pg_temp.found(query text) returns text language sql as $$
  select string_agg((result ->> 'kind') || ':' || (result ->> 'title'), ',')
  from jsonb_array_elements(public.search_story('statia-meteo-seed01', query) -> 'results') as result;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The writer's story: two characters, an entry, two chapters, a scene, an idea, an event and
-- marketing notes, some with [[links]].
insert into public.story_characters (id, story_id, user_id, name, sheet, custom_values)
values ('19700000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Ana',
        '{"also_known_as": "Ani, Paznica ,", "occupation": "Paznică de far. [[Ana]] despre ea."}', '{}'),
       ('19700000-0000-4000-8000-0000000000b2', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Bogdan',
        '{"occupation": "Pescar"}', '{"x": "Vecinul [[PAZNICA]]."}');
insert into public.story_bible_entries (id, story_id, user_id, section_id, title, tags, body)
values ('19700000-0000-4000-8000-0000000000e1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001',
        (select id from public.story_bible_sections where story_id = '00000000-0000-4000-9000-000000000001' order by position limit 1),
        'Farul', '{insula}', repeat('Valuri lungi. ', 20) || 'Aici [[ani]] urcă treptele. ' || repeat('Vânt. ', 40));
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c197aaaa', 1,
        'Furtuna', 'Ștefan o vede pe [[ANA]] în ploaie.', 'draft'),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c197bbbb', 2,
        '', 'Nimic aici.', 'draft');
insert into public.chapter_scenes (story_id, user_id, chapter_id, position, title, summary)
select '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', id, 1,
  'Pe stâncă', 'Bogdan aruncă năvodul.'
from public.chapters where code = 'c197aaaa';
insert into public.story_ideas (story_id, user_id, kind, body, outcome)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'question',
        'Cine a stins farul?', 'Poate [[Ana]].');
insert into public.story_events (story_id, user_id, title, display_date, sort_value, description)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
        'Naufragiul', '2054', 2054, 'Barca se scufundă lângă far.');
insert into public.story_marketing (story_id, user_id, back_cover_blurb)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
        'Un far stins și o insulă care tace.');

/* ---------- 1. Search (S1-E17-30) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.found('FAR'),
  'character:Ana,entry:Farul,idea:Cine a stins farul?,event:Naufragiul,marketing:back_cover_blurb',
  'a search finds every type of item, grouped by type, ignoring capitals');
select is(pg_temp.found('stefan'), 'chapter:Furtuna',
  'accents are ignored, and a chapter''s manuscript is searched');
select is((select result ->> 'snippet' from jsonb_array_elements(
    public.search_story('statia-meteo-seed01', 'stefan') -> 'results') as result),
  'Furtuna Ștefan o vede pe [[ANA]] în ploaie.', 'the snippet shows the original text, accents and all');
select is(pg_temp.found('pescar'), 'character:Bogdan', 'a character''s sheet fields are searched');
select is(pg_temp.found('vecinul'), 'character:Bogdan', 'the writer''s own fields are searched too');
select is((select (result ->> 'kind') || ':' || (result ->> 'chapter') from jsonb_array_elements(
    public.search_story('statia-meteo-seed01', 'năvod') -> 'results') as result),
  'scene:c197aaaa', 'a scene is found with its chapter, so the result opens it');
select is((select result ->> 'snippet' from jsonb_array_elements(
    public.search_story('statia-meteo-seed01', 'treptele') -> 'results') as result),
  '…Valuri lungi. Valuri lungi. Valuri lungi. Aici [[ani]] urcă treptele. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. Vânt. …',
  'a long text''s snippet is cut around the match, with … at both ends');
select is(jsonb_array_length(public.search_story('statia-meteo-seed01', ' a ') -> 'results'), 0,
  'a query under two letters finds nothing');
-- Added as the database owner (the writer adds ideas through add_story_idea()).
reset role;
insert into public.story_ideas (story_id, user_id, kind, body)
select '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'todo',
  'Zmeu ' || number from generate_series(1, 25) as number;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from jsonb_array_elements(
    public.search_story('statia-meteo-seed01', 'zmeu') -> 'results')), 20,
  'at most 20 results of one type');

/* ---------- 2. Cross-links (S1-E17-31) ---------- */

select is((select string_agg((target ->> 'kind') || ':' || (target -> 'names')::text, ' ')
           from jsonb_array_elements(public.story_link_targets('statia-meteo-seed01') -> 'targets') as target
           where target ->> 'title' in ('Ana', 'Farul', 'Furtuna')),
  'character:["Ana", "Ani", "Paznica"] entry:["Farul"] chapter:["Furtuna"]',
  'link targets: characters by name and every alias, entries and chapters by title');
select ok(not exists (select 1 from jsonb_array_elements(
    public.story_link_targets('statia-meteo-seed01') -> 'targets') as target
    where target ->> 'ref' = 'c197bbbb'), 'a chapter without a title can''t be linked');

/* ---------- 3. Mentioned in (S1-E17-12) ---------- */

select is((select string_agg((item ->> 'kind') || ':' || (item ->> 'title'), ',')
           from jsonb_array_elements(public.character_mentions('19700000-0000-4000-8000-0000000000a1') -> 'items') as item),
  'character:Bogdan,entry:Farul,chapter:Furtuna,idea:Cine a stins farul?',
  '[[the name]] or [[an alias]] in any capitals is found everywhere but the character''s own sheet');
select is(jsonb_array_length(public.character_mentions('19700000-0000-4000-8000-0000000000b2') -> 'items'), 0,
  'a name in plain text, without [[ ]], is not a mention');
select ok(public.search_story('statia-meteo-seed01', 'far')::text
    || public.character_mentions('19700000-0000-4000-8000-0000000000a1')::text
    || public.story_link_targets('statia-meteo-seed01')::text !~ '00000000-0000-4000-8000-000000000001',
  'no answer carries the writer''s user ID (rule 15)');

/* ---------- 4. Nobody else ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.search_story('statia-meteo-seed01', 'far') ->> 'outcome')
    || (public.story_link_targets('statia-meteo-seed01') ->> 'outcome')
    || (public.character_mentions('19700000-0000-4000-8000-0000000000a1') ->> 'outcome'),
  'not_foundnot_foundnot_found', 'another member can''t search the story, read its links or the mentions');
reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.search_story('statia-meteo-seed01', 'far') $$), '42501',
  'signed out, nobody can search a story');

select * from finish();

rollback;
