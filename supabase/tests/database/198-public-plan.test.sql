-- Database tests for what readers can see of a story's plan (stories S1-E17-32 to S1-E17-35;
-- CLAUDE.md rules 1, 6, 15, 18 and 19).
-- What it proves:
-- - nothing is public by default; the writer turns areas on, and turning one off takes it away
--   at once;
-- - "Keep private" hides one character, relationship, section, entry or event; a sheet shows only
--   its open groups (Inside, notes and the writer's own fields closed by default);
-- - the spoiler guard: an item waiting for chapter N shows only once the reader reached it, never
--   to a visitor who isn't signed in;
-- - the story's own read rules apply: no readable chapter, a rating above the reader's age, a
--   block either way or a hidden item and nothing shows;
-- - "Preview as a reader" is the writer's alone; the switches can't be read or changed by anyone
--   else;
-- - the reporting contract finds a public item and refuses a private one; a public character's
--   picture is readable once its check passed (atlas_images_select_public, allowed and denied);
-- - no answer carries a user ID (rule 15).
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) reads; kid_14_ok (…03) is
-- under 16. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
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
-- The names in one list of the public answer, in order.
create function pg_temp.names(list text, label text) returns text language sql as $$
  select coalesce(string_agg(item ->> label, ','), '')
  from jsonb_array_elements(public.get_public_story_plan('statia-meteo-seed01') -> list) as item;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The writer's story, published: chapters one and two are out, three is a draft.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                             published_title, published_body, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c198aaaa', 1,
        'Unu', 'Unu.', 'published', 'Unu', 'Unu.', now(), now()),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c198bbbb', 2,
        'Doi', 'Doi.', 'published', 'Doi', 'Doi.', now(), now()),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c198cccc', 3,
        'Trei', 'Trei.', 'draft', null, null, null, null);
update public.stories set first_published_at = now() where id = '00000000-0000-4000-9000-000000000001';
-- Its plan: Ana is public, Bogdan will be kept private, Cezar waits for chapter two.
insert into public.story_character_fields (id, story_id, user_id, position, name)
values ('19800000-0000-4000-8000-0000000000f1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 1, 'Zodie');
insert into public.story_characters (id, story_id, user_id, name, sheet, custom_values, show_from_chapter_id)
values ('19800000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Ana',
        '{"occupation": "Paznică", "personality": "Tăcută", "notes": "Secret"}',
        '{"19800000-0000-4000-8000-0000000000f1": "Leu"}', null),
       ('19800000-0000-4000-8000-0000000000b1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Bogdan', '{}', '{}', null),
       ('19800000-0000-4000-8000-0000000000c1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Cezar', '{}', '{}',
        (select id from public.chapters where code = 'c198bbbb'));
insert into public.story_character_relationships (id, story_id, user_id, from_character_id, to_character_id, kind, note)
values ('19800000-0000-4000-8000-0000000000d1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', '19800000-0000-4000-8000-0000000000a1',
        '19800000-0000-4000-8000-0000000000b1', 'sibling_of', ''),
       ('19800000-0000-4000-8000-0000000000d2', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', '19800000-0000-4000-8000-0000000000a1',
        '19800000-0000-4000-8000-0000000000c1', 'friend_of', 'Notă privată');
insert into public.story_bible_entries (id, story_id, user_id, section_id, title, is_private)
select ('19800000-0000-4000-8000-0000000000e' || place)::uuid, '00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-8000-000000000001', sections.id, wanted.title, wanted.is_private
from (values (1, 1, 'Farul', false), (2, 1, 'Ascuns', true), (3, 2, 'Taina', false)) as wanted (place, section_place, title, is_private)
join public.story_bible_sections as sections
  on sections.story_id = '00000000-0000-4000-9000-000000000001' and sections.position = wanted.section_place;
update public.story_bible_sections set is_private = true
where story_id = '00000000-0000-4000-9000-000000000001' and position = 2;
insert into public.story_events (id, story_id, user_id, title, sort_value, show_from_chapter_id)
values ('19800000-0000-4000-8000-000000000ee1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Plecarea', 1, null),
       ('19800000-0000-4000-8000-000000000ee2', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Moartea', 2, (select id from public.chapters where code = 'c198bbbb'));

/* ---------- 1. The switches (S1-E17-32) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_public_story_plan('statia-meteo-seed01') -> 'areas', '[]'::jsonb,
  'a new plan shows readers nothing: every area is off');
select is(pg_temp.names('characters', 'name'), '', 'and no character');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_story_public_areas('statia-meteo-seed01', '{timeline,characters,bible,relationship_map}') -> 'areas',
  '["characters", "relationship_map", "bible", "timeline"]'::jsonb, 'the writer turns areas on, saved in the settings'' order');
select is(pg_temp.refusal($$ select public.set_story_public_areas('statia-meteo-seed01', '{drafts}') $$),
  '23514:unknown_area', 'an unknown area is refused');
select is(public.set_plan_item_privacy('19800000-0000-4000-8000-0000000000b1', true) ->> 'outcome', 'ok',
  'the writer keeps Bogdan private');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.names('characters', 'name'), 'Ana',
  'a reader sees the public characters: not the private one, not the one waiting for chapter two');
select is(public.get_public_story_plan('statia-meteo-seed01') #> '{characters,0,sheet}', '{"occupation": "Paznică"}'::jsonb,
  'a sheet shows its open groups only: Inside and notes are private by default');
select is(public.get_public_story_plan('statia-meteo-seed01') -> 'fields', '[]'::jsonb,
  'the writer''s own fields are private by default, names and all');
select is(pg_temp.names('relationships', 'kind'), '',
  'a relationship to a private or waiting character doesn''t show');
select is(pg_temp.names('sections', 'name') || '|' || (select string_agg(entry ->> 'title', ',')
    from jsonb_array_elements(public.get_public_story_plan('statia-meteo-seed01') #> '{sections,0,entries}') as entry),
  '|Farul', 'the world shows its public entries; a private entry and a private section don''t');
select is(pg_temp.names('events', 'title'), 'Plecarea', 'the timeline shows the events without a guard');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_character_public_parts('19800000-0000-4000-8000-0000000000a1',
    '{basics,inside,19800000-0000-4000-8000-0000000000f1}') ->> 'outcome', 'ok',
  'the writer opens Inside and their own field on Ana''s sheet');
select is(pg_temp.refusal($$ select public.set_character_public_parts('19800000-0000-4000-8000-0000000000a1', '{diary}') $$),
  '23514:unknown_part', 'an unknown part of a sheet is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_public_story_plan('statia-meteo-seed01') #> '{characters,0,sheet}',
  '{"occupation": "Paznică", "personality": "Tăcută"}'::jsonb, 'readers now see Inside, still not the notes');
select is(public.get_public_story_plan('statia-meteo-seed01') #>> '{fields,0,name}', 'Zodie',
  'and the opened field, with its name');

/* ---------- 2. The spoiler guard (S1-E17-35) ---------- */

select pg_temp.sign_out();
select is(pg_temp.names('characters', 'name'), 'Ana',
  'a visitor who isn''t signed in sees the public plan, never an item with a chapter set');
reset role;
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
select '00000000-0000-4000-8000-000000000007', story_id, id, 10, 'computer'
from public.chapters where code = 'c198bbbb';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.names('characters', 'name') || '|' || pg_temp.names('events', 'title') || '|' || pg_temp.names('relationships', 'kind'),
  'Ana,Cezar|Plecarea,Moartea|friend_of',
  'once the reader reached chapter two, what waited for it shows, with its relationships');
select ok(public.get_public_story_plan('statia-meteo-seed01')::text !~ 'Notă privată',
  'the writer''s note on a relationship stays private');
select ok(public.get_public_story_plan('statia-meteo-seed01')::text !~ '00000000-0000-4000-8000-00000000000',
  'no public answer carries a user ID (rule 15)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.set_plan_item_show_from('19800000-0000-4000-8000-0000000000d2', 'c198aaaa') $$),
  '23514:no_guard', 'a relationship takes no chapter: it follows its characters');
select is(pg_temp.refusal($$ select public.set_plan_item_show_from('19800000-0000-4000-8000-000000000ee1', 'zzzzzzzz') $$),
  '23514:unknown_chapter', 'a chapter of another story is refused');

/* ---------- 3. The story's own read rules (S1-E17-33) ---------- */

reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_public_story_plan('statia-meteo-seed01') ->> 'outcome', 'not_found',
  'a reader the rating doesn''t allow gets nothing of the plan (rule 18)');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000001';
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_public_story_plan('statia-meteo-seed01') ->> 'outcome', 'not_found',
  'with a block either way, nothing of the plan shows');
reset role;
delete from public.blocks where user_id = '00000000-0000-4000-8000-000000000007';
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'atlas_item', '19800000-0000-4000-8000-0000000000e1',
        'hidden', '00000000-0000-4000-8000-000000000010', 'Test.');
select is(public.get_public_story_plan('statia-meteo-seed01') -> 'sections', '[]'::jsonb,
  'an entry a moderator hid is gone for readers (S1-E17-34)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.story_plan_visibility('statia-meteo-seed01') -> 'items' ? '19800000-0000-4000-8000-0000000000e1',
  'the writer still has the hidden entry in their plan');
-- The writer's other story has no readable chapter.
select is(public.set_story_public_areas('the-girl-who-fixed-radios-seed02', '{characters}') ->> 'outcome', 'ok',
  'the writer can turn areas on before publishing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_public_story_plan('the-girl-who-fixed-radios-seed02') ->> 'outcome', 'not_found',
  'but a story that isn''t published shows nothing of its plan');

/* ---------- 4. The preview and the switches are the writer's alone ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select string_agg((character ->> 'name') || ':' || coalesce(character #>> '{show_from,code}', '-'), ',')
           from jsonb_array_elements(public.preview_story_plan('statia-meteo-seed01') -> 'characters') as character),
  'Ana:-,Cezar:c198bbbb', '"Preview as a reader" shows what readers see, each guard marked instead of applied');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.preview_story_plan('statia-meteo-seed01') ->> 'outcome', 'not_found',
  'nobody else can preview the writer''s plan');
select is((public.story_plan_visibility('statia-meteo-seed01') ->> 'outcome')
    || (public.set_plan_item_privacy('19800000-0000-4000-8000-0000000000a1', true) ->> 'outcome'),
  'not_foundnot_found', 'nor read or change the switches');
select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.preview_story_plan('statia-meteo-seed01') $$), '42501',
  'signed out, nobody previews a plan');

/* ---------- 5. Reporting and pictures (S1-E17-34, rule 19) ---------- */

reset role;
select is((select owner_user_id::text from public.reportable_item_owner('atlas_item', '19800000-0000-4000-8000-0000000000a1')),
  '00000000-0000-4000-8000-000000000001', 'a public character can be reported, and the report finds its writer');
select is(pg_temp.refusal($$ select * from public.reportable_item_owner('atlas_item', '19800000-0000-4000-8000-0000000000b1') $$),
  '23514', 'a private character can''t be reported: it answers as if it didn''t exist');
select is(public.reportable_item_summary('atlas_item', '19800000-0000-4000-8000-0000000000a1'),
  'Character "Ana" in the world of Stația meteo', 'the queue says what was reported');
select is(public.plan_item_address('19800000-0000-4000-8000-0000000000a1'),
  '/s/statia-meteo-seed01/atlas/characters/19800000-0000-4000-8000-0000000000a1',
  'a notice links to the reader page that shows it');

insert into public.picture_checks (id, user_id, story_id, bucket, path, kind, status)
values ('19800000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-9000-000000000001', 'atlas-images',
        '00000000-0000-4000-9000-000000000001/19800000-0000-4000-8000-0000000000ab.webp', 'atlas_image', 'passed');
insert into storage.objects (bucket_id, name)
values ('atlas-images', '00000000-0000-4000-9000-000000000001/19800000-0000-4000-8000-0000000000ab.webp');
update public.story_characters set picture_id = '19800000-0000-4000-8000-0000000000aa'
where id = '19800000-0000-4000-8000-0000000000a1';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'), 1,
  'allowed: atlas_images_select_public: a reader sees the passed picture of a public character');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_plan_item_privacy('19800000-0000-4000-8000-0000000000a1', true) ->> 'outcome', 'ok',
  'the writer keeps Ana private after all');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'), 0,
  'denied: atlas_images_select_public: a private character''s picture is the writer''s alone');

/* ---------- 6. Turning off ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_story_public_areas('statia-meteo-seed01', '{}') -> 'areas', '[]'::jsonb,
  'the writer turns every area off');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.names('characters', 'name') || pg_temp.names('events', 'title'), '',
  'and readers see nothing of it at once');

select * from finish();

rollback;
