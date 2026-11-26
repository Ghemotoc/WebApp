-- Database tests for a relationship that waits for a chapter (user stories bundle 6, story 6.14:
-- "each character, relationship and entry shows from a chapter the writer picks … a reader who
-- hasn't reached it doesn't see it, and the server never sends it").
-- What it proves:
-- - the writer sets and clears the chapter on their own relationship; another member can't;
-- - a reader who hasn't reached the chapter gets no trace of it, nor does a visitor;
-- - the writer's preview shows it with the chapter it waits for;
-- - once the reader opened that chapter it shows, with no chapter attached;
-- - "What readers can see" hands the writer back the chapter code;
-- - Undo after a delete puts the chapter back, and leaves it off once the chapter is deleted.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) reads; teen_17 (…02) is
-- another member. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The relationship kinds in the public answer, in order.
create function pg_temp.kinds() returns text language sql as $$
  select coalesce(string_agg(item ->> 'kind', ','), '')
  from jsonb_array_elements(public.get_public_story_plan('statia-meteo-seed01') -> 'relationships') as item;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The writer's story, published: chapters one and two are out.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                             published_title, published_body, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c409aaaa', 1,
        'Unu', 'Unu.', 'published', 'Unu', 'Unu.', now(), now()),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c409bbbb', 2,
        'Doi', 'Doi.', 'published', 'Focul', 'Doi.', now(), now());
update public.stories set first_published_at = now() where id = '00000000-0000-4000-9000-000000000001';
-- Two public characters and the secret between them.
insert into public.story_characters (id, story_id, user_id, name)
values ('40900000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Ana'),
       ('40900000-0000-4000-8000-0000000000b1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Bogdan');
insert into public.story_character_relationships (id, story_id, user_id, from_character_id, to_character_id, kind)
values ('40900000-0000-4000-8000-0000000000d1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', '40900000-0000-4000-8000-0000000000a1',
        '40900000-0000-4000-8000-0000000000b1', 'sibling_of');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_story_public_areas('statia-meteo-seed01', '{characters,relationship_map}');

/* ---------- 1. Setting the chapter ---------- */

select is(public.set_plan_item_show_from('40900000-0000-4000-8000-0000000000d1', 'c409bbbb') ->> 'outcome', 'ok',
  'the writer holds the relationship back until chapter two');
select is(public.story_plan_visibility('statia-meteo-seed01') #>> '{items,40900000-0000-4000-8000-0000000000d1,show_from}',
  'c409bbbb', '"What readers can see" hands the writer back the chapter');
select is(public.preview_story_plan('statia-meteo-seed01') #>> '{relationships,0,show_from,title}', 'Focul',
  'the writer''s preview shows it, marked with the chapter it waits for');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.set_plan_item_show_from('40900000-0000-4000-8000-0000000000d1', '') ->> 'outcome', 'not_found',
  'another member can''t clear the writer''s chapter');

/* ---------- 2. What readers get ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.kinds(), '', 'a reader who hasn''t reached chapter two doesn''t see the relationship');
select ok(public.get_public_story_plan('statia-meteo-seed01')::text !~ '40900000-0000-4000-8000-0000000000d1',
  'and the server sends no trace of it');
select pg_temp.sign_out();
select is(pg_temp.kinds(), '', 'a visitor who isn''t signed in doesn''t see it either');

reset role;
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
select '00000000-0000-4000-8000-000000000007', story_id, id, 10, 'computer'
from public.chapters where code = 'c409bbbb';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.kinds(), 'sibling_of', 'once the reader opened chapter two, the relationship shows');
select is(public.get_public_story_plan('statia-meteo-seed01') #> '{relationships,0,show_from}', 'null'::jsonb,
  'with no chapter attached for a reader');

/* ---------- 3. Undo keeps the chapter ---------- */

-- The writer's claims without the authenticated role, so the deleted row can be kept in a
-- temporary table for the two Undo checks.
reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
create temporary table removed_relationship on commit drop as
select public.delete_character_relationship('40900000-0000-4000-8000-0000000000d1') -> 'relationship' as row_data;
select is(public.restore_character_relationship((select row_data from removed_relationship)) ->> 'outcome', 'ok',
  'Undo puts the deleted relationship back');
select is((select chapters.code from public.story_character_relationships as links
           join public.chapters on chapters.id = links.show_from_chapter_id
           where links.id = '40900000-0000-4000-8000-0000000000d1'), 'c409bbbb',
  'still waiting for chapter two');

-- Deleted again, then chapter two is deleted before Undo.
select public.delete_character_relationship('40900000-0000-4000-8000-0000000000d1');
update public.chapters set deleted_at = now() where code = 'c409bbbb';
select public.restore_character_relationship((select row_data from removed_relationship));
select is((select count(*)::int from public.story_character_relationships
           where id = '40900000-0000-4000-8000-0000000000d1'), 1,
  'Undo after the chapter was deleted still puts the relationship back');
select is((select show_from_chapter_id from public.story_character_relationships
           where id = '40900000-0000-4000-8000-0000000000d1'), null,
  'without the chapter that no longer exists');

select * from finish();
rollback;
