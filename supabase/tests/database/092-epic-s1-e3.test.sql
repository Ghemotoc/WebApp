-- Epic check for S1-E3, the writer editor and chapters (story S1-E3-QA).
-- It adds no feature: it walks the epic's main journey through the database, crossing every March
-- story of the epic, and checks the seed personas the story names against the epic's rules.
-- Journey (S1-E3-01 × S1-E3-13 × S1-E3-06 × S1-E3-02a × S1-E3-03 × S1-E3-04 × S1-E3-05):
--   adult_writer makes a 16+ story with an automatic cover → it stays private until a chapter is
--   published → two chapters written with the autosave → chapter one published now, chapter two
--   scheduled and published by the job → an adult reader sees both, teen_17 (16 to 17) sees the
--   16+ story, kid_14_ok and a signed-out visitor don't → the writer reorders, deletes and undoes
--   a chapter, and marks the story Completed → deleting the story hides it from everyone, undo
--   brings it back.
-- Personas (S1-E2-02 × S1-E3-01 × S1-E3-02a × S1-E3-04): teen_17, kid_14_ok and kid_14_waiting
--   stay read-only while adults_only is on (minors are seed data in March); another adult can't
--   touch the writer's chapters; nobody but the owner sees a draft.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so they run with the test's own rights.
create function pg_temp.slug() returns text language sql security definer as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-0000000e3e3e' $$;
create function pg_temp.code_at(chapter_position integer) returns text language sql security definer as $$
  select code from public.chapters where story_id = '00000000-0000-4000-9000-0000000e3e3e'
    and deleted_at is null and position = chapter_position $$;
create function pg_temp.code_of(chapter_title text) returns text language sql security definer as $$
  select code from public.chapters where story_id = '00000000-0000-4000-9000-0000000e3e3e'
    and draft_title = chapter_title $$;
-- The chapter titles a reader's story page lists, in order.
create function pg_temp.reader_titles() returns text language sql as $$
  select string_agg(chapter ->> 'title', ',' order by (chapter ->> 'number')::integer)
  from jsonb_array_elements(public.get_story_page(pg_temp.slug()) -> 'chapters') as chapter $$;

-- 1. A new 16+ story with an automatic cover (S1-E3-01, S1-E3-13, S1-E3-06).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.create_story('Verificarea epicului', 'O poveste de test.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000e3e3e',
  '{"rating": "16_plus", "ai_disclosure": "no_ai"}')) ->> 'outcome', 'ok',
  'adult_writer makes a 16+ story with an automatic cover');
select is(public.get_story_page(pg_temp.slug()) -> 'is_public', 'false'::jsonb,
  'the owner sees it, marked as not public yet');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_story_page(pg_temp.slug()), null, 'an adult reader can''t see it before a chapter is published');

-- 2. Two chapters with the autosave (S1-E3-02a).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.create_chapter(pg_temp.slug())) ->> 'outcome', 'ok', 'chapter one is made');
select is((public.create_chapter(pg_temp.slug())) ->> 'outcome', 'ok', 'chapter two is made');
select is((public.save_chapter_draft(pg_temp.code_at(1), 'Dimineața', 'Bunica **notează** vremea.', 1)) ->> 'status', 'saved',
  'chapter one is saved');
select is((public.save_chapter_draft(pg_temp.code_at(2), 'Seara', 'Vântul se întoarce.', 1)) ->> 'status', 'saved',
  'chapter two is saved');

-- 3. Publish now and on a schedule (S1-E3-03).
select is((public.publish_chapter(pg_temp.code_at(1))) ->> 'outcome', 'ok', 'chapter one is published now');
select is((public.schedule_chapter(pg_temp.code_at(2), now() + interval '1 hour')) ->> 'outcome', 'ok',
  'chapter two is scheduled for later');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.reader_titles(), 'Dimineața', 'an adult reader sees the published chapter only');
reset role;
update public.chapters set scheduled_for = now() - interval '1 minute' where code = pg_temp.code_at(2);
select is(public.publish_due_chapters(), 1, 'the job publishes chapter two when its time comes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.reader_titles(), 'Dimineața,Seara', 'the adult reader sees both chapters in order');

-- 4. Ratings across ages (S1-E3-06 × S1-E2-02).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.reader_titles(), 'Dimineața,Seara', 'teen_17 (16 to 17) sees the 16+ story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_story_page(pg_temp.slug()), null, 'kid_14_ok (13 to 15) can''t see the 16+ story');
select pg_temp.sign_out();
select is(public.get_story_page(pg_temp.slug()), null, 'a signed-out visitor counts as under 16 and can''t see it');

-- 5. Manage chapters and the story's status (S1-E3-04, S1-E3-05).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.move_chapter(pg_temp.code_at(2), -1)) ->> 'outcome', 'ok', 'the writer moves chapter two up');
select is((public.delete_chapter(pg_temp.code_at(2))) ->> 'outcome', 'ok', 'the writer deletes the chapter now first ("Dimineața")');
select is((public.update_my_story(pg_temp.slug(), '{"completion_status": "completed"}')) ->> 'outcome', 'ok',
  'the writer marks the story Completed');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.reader_titles(), 'Seara', 'the reader sees the new order without the deleted chapter');
select is(public.get_story_page(pg_temp.slug()) ->> 'completion_status', 'completed', 'and the story as Completed');
select is((public.restore_chapter(pg_temp.code_of('Dimineața'))) ->> 'outcome',
  'not_found', 'denied: another adult (the teacher persona) can''t undo the writer''s deletion');

-- 6. Deleting the whole story hides it from everyone; undo brings it back (S1-E3-05).
-- Undo brings back the chapters deleted with the story (the same deleted_at). In a real session
-- the chapter above was deleted earlier; inside this one transaction now() never moves, so its
-- time is set back an hour to keep the two deletions apart, as they are in real use.
reset role;
update public.chapters set deleted_at = now() - interval '1 hour' where code = pg_temp.code_of('Dimineața');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.delete_my_story(pg_temp.slug());
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_story_page(pg_temp.slug()), null, 'a deleted story is hidden from readers at once');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.restore_my_story(pg_temp.slug())) ->> 'outcome', 'ok', 'the writer undoes the deletion');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.reader_titles(), 'Seara', 'the story is back with its live chapter');

-- 7. Read-only personas in March (S1-E2-02 × S1-E3-01 × S1-E3-02a).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.create_chapter('scrisori-din-cutia-postala-seed03')) ->> 'outcome', 'not_active',
  'denied: teen_17 can''t add a chapter to their own seed story while adults_only is on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((public.create_story('Nu', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null,
  '{"rating": "all_ages", "ai_disclosure": "no_ai"}')) ->> 'outcome', 'not_active',
  'denied: kid_14_ok can''t write while adults_only is on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.create_story('Nu', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null,
  '{"rating": "all_ages", "ai_disclosure": "no_ai"}')) ->> 'outcome', 'not_active',
  'denied: kid_14_waiting can''t write either');

select * from finish();

rollback;
