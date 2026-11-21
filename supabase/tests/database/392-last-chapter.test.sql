-- Database tests for the last chapter (CALM-6; Robert's decision card "A switch when
-- publishing", 20 Nov 2026, 12:43 UTC).
-- What it proves:
-- - publish_chapter(as_last) marks the chapter and turns the story Completed; schedule_chapter
--   (as_last) marks it and the story turns Completed only when publish_due_chapters() puts it out;
-- - not_last refuses the mark while a later chapter is out or scheduled;
-- - set_chapter_last() works on a scheduled chapter (on and off) and on the latest published one
--   (on only, Completed at once), and refuses everything else;
-- - the mark comes off, and the story goes back to Ongoing, on unpublish, cancel, delete, a
--   chapter published or scheduled after it, a reorder and a restore after it, and on Ongoing in
--   update_my_story(); Completed by hand marks nothing;
-- - a story never has two live marks; the backfill marks a Completed story's last published
--   chapter;
-- - readers get last_chapter_number only while a mark holds, and next_chapter;
-- - another writer, a read-only account and a visitor can't use the switch or read the panel's view.
begin;

create extension if not exists pgtap with schema extensions;

select plan(59);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so they run with the test's own rights.
create function pg_temp.code_of(chapter_title text) returns text language sql security definer as $$
  select code from public.chapters where draft_title = chapter_title
  and story_id = '00000000-0000-4000-9000-000000000001' $$;
create function pg_temp.marked() returns text language sql security definer as $$
  select coalesce(string_agg(draft_title, ',' order by position), 'none') from public.chapters
  where story_id = '00000000-0000-4000-9000-000000000001' and is_last $$;
create function pg_temp.story_status() returns text language sql security definer as $$
  select completion_status::text from public.stories where id = '00000000-0000-4000-9000-000000000001' $$;
create function pg_temp.next_chapter() returns jsonb language sql security definer as $$
  select public.next_chapter_json('00000000-0000-4000-9000-000000000001') $$;
create function pg_temp.last_number() returns integer language sql security definer as $$
  select public.story_last_chapter_number('00000000-0000-4000-9000-000000000001') $$;

-- Four chapters, A B C D, on adult_writer's seed story, all with words, none out yet.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_chapter('statia-meteo-seed01') from generate_series(1, 4);
reset role;
update public.chapters set draft_title = chr(64 + position), draft_body = 'Text ' || chr(64 + position) || '.'
  where story_id = '00000000-0000-4000-9000-000000000001';

-- 1. Publishing as the last.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.publish_chapter(pg_temp.code_of('A'))) ->> 'outcome', 'ok', 'A goes out without the mark');
select is(pg_temp.story_status(), 'ongoing', 'without the mark the story stays Ongoing');
select is(pg_temp.last_number(), null, 'no mark, no "of N"');
select is((public.publish_chapter(pg_temp.code_of('C'), true)) ->> 'outcome', 'ok', 'allowed: the writer publishes C as the last');
select is(pg_temp.marked(), 'C', 'C holds the mark');
select is(pg_temp.story_status(), 'completed', 'the story turns Completed when the marked chapter is out');
select is(pg_temp.last_number(), 2, 'readers see "of 2": A and C are out, B is a draft');
select is((public.publish_chapter(pg_temp.code_of('B'), true)) ->> 'outcome', 'not_last', 'B can''t be the last while C is out after it');
select is((public.publish_chapter(pg_temp.code_of('B'))) ->> 'outcome', 'ok', 'B goes out without the mark');
select is(pg_temp.marked(), 'C', 'a chapter out before the marked one leaves the mark');
select is(pg_temp.last_number(), 3, 'readers now see "of 3"');

-- 2. The switch on published chapters.
select is((public.set_chapter_last(pg_temp.code_of('A'), true)) ->> 'outcome', 'not_last', 'A, an earlier published chapter, can''t be the last');
select is((public.set_chapter_last(pg_temp.code_of('C'), false)) ->> 'outcome', 'wrong_state', 'a published chapter''s mark doesn''t come off with the switch');
select is((public.set_chapter_last(pg_temp.code_of('D'), true)) ->> 'outcome', 'wrong_state', 'a draft can''t take the mark');

-- 3. A chapter scheduled after the marked one takes the mark off.
select is((public.schedule_chapter(pg_temp.code_of('D'), now() + interval '2 days')) ->> 'outcome', 'ok', 'D is scheduled after C');
select is(pg_temp.marked(), 'none', 'the mark comes off C');
select is(pg_temp.story_status(), 'ongoing', 'and the story is Ongoing again');

-- 4. The switch on a scheduled chapter, and the job putting it out.
select is((public.set_chapter_last(pg_temp.code_of('D'), true)) ->> 'outcome', 'ok', 'allowed: the switch on the scheduled D');
select is(pg_temp.story_status(), 'ongoing', 'a scheduled mark doesn''t complete the story yet');
select is(pg_temp.last_number(), 4, 'readers see "of 4" while D is scheduled');
select is((pg_temp.next_chapter()) ->> 'is_last', 'true', 'next_chapter says the next one is the last');
select is(((pg_temp.next_chapter()) ->> 'number')::integer, 4, 'next_chapter is chapter 4');
select is((public.my_chapter_last_state(pg_temp.code_of('D'))) ->> 'is_last', 'true', 'the panel sees D''s mark');
select is(((public.my_chapter_last_state(pg_temp.code_of('C'))) ->> 'can_mark')::boolean, false, 'the panel can''t mark C while D is scheduled after it');
select is((public.set_chapter_last(pg_temp.code_of('D'), false)) ->> 'outcome', 'ok', 'the switch goes off on the scheduled D');
select is(pg_temp.marked(), 'none', 'D lost its mark');
select is((public.set_chapter_last(pg_temp.code_of('D'), true)) ->> 'outcome', 'ok', 'and on again');
reset role;
update public.chapters set scheduled_for = now() - interval '1 second' where code = pg_temp.code_of('D');
select is(public.publish_due_chapters(), 1, 'the job puts D out');
select is(pg_temp.story_status(), 'completed', 'the job completes the story when the marked chapter is out');

-- 5. Unpublishing the marked chapter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.unpublish_chapter(pg_temp.code_of('D'))) ->> 'outcome', 'ok', 'D is unpublished');
select is(pg_temp.marked() || ' ' || pg_temp.story_status(), 'none ongoing', 'unpublishing takes the mark off and the story is Ongoing');

-- 6. The latest published chapter, then back to Ongoing in Story settings.
select is((public.set_chapter_last(pg_temp.code_of('C'), true)) ->> 'outcome', 'ok', 'allowed: the switch on C, now the latest published');
select is(pg_temp.story_status(), 'completed', 'a published chapter completes the story at once');
select is((public.update_my_story('statia-meteo-seed01', '{"completion_status": "ongoing"}')) ->> 'outcome', 'ok', 'the writer sets the story to Ongoing');
select is(pg_temp.marked(), 'none', 'Ongoing takes the mark off');
select is((public.update_my_story('statia-meteo-seed01', '{"completion_status": "completed"}')) ->> 'outcome', 'ok', 'the writer sets Completed by hand');
select is(pg_temp.marked() || ' ' || coalesce(pg_temp.last_number()::text, 'null'), 'none null', 'Completed by hand marks nothing and shows no "of N"');

-- 7. Cancelling a marked schedule.
select is((public.schedule_chapter(pg_temp.code_of('D'), now() + interval '1 day', true)) ->> 'outcome', 'ok', 'allowed: D scheduled as the last');
select is((public.cancel_schedule(pg_temp.code_of('D'))) ->> 'outcome', 'ok', 'its schedule is cancelled');
select is(pg_temp.marked() || ' ' || pg_temp.story_status(), 'none ongoing', 'cancelling takes the mark off and the story is Ongoing');

-- 8. Deleting the marked chapter, then restoring it after a new mark.
select is((public.set_chapter_last(pg_temp.code_of('C'), true)) ->> 'outcome', 'ok', 'C is marked again');
select is((public.delete_chapter(pg_temp.code_of('C'))) ->> 'outcome', 'ok', 'C is deleted');
select is(pg_temp.marked() || ' ' || pg_temp.story_status(), 'none ongoing', 'deleting takes the mark off and the story is Ongoing');
select is((public.set_chapter_last(pg_temp.code_of('B'), true)) ->> 'outcome', 'ok', 'B, now the latest published, is marked');
select is((public.restore_chapter(pg_temp.code_of('C'))) ->> 'outcome', 'ok', 'C comes back, at the end');
select is(pg_temp.marked() || ' ' || pg_temp.story_status(), 'none ongoing', 'a published chapter restored after the mark takes it off');

-- 9. A reorder that puts a published chapter after the marked one.
select is((public.unpublish_chapter(pg_temp.code_of('C'))) ->> 'outcome', 'ok', 'C goes back to a draft');
select is((public.set_chapter_last(pg_temp.code_of('B'), true)) ->> 'outcome', 'ok', 'B is marked');
select is((public.set_chapter_order('statia-meteo-seed01',
  array[pg_temp.code_of('B'), pg_temp.code_of('A'), pg_temp.code_of('D'), pg_temp.code_of('C')])) ->> 'outcome', 'ok', 'B is dragged before A');
select is(pg_temp.marked() || ' ' || pg_temp.story_status(), 'none ongoing', 'A, out after B, takes the mark off');

-- 10. Another writer, a read-only account and a visitor.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.set_chapter_last(pg_temp.code_of('A'), true)) ->> 'outcome', 'not_found', 'denied: another writer can''t mark someone else''s chapter');
select is(public.my_chapter_last_state(pg_temp.code_of('A')), null, 'denied: another writer can''t read the panel''s view');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.set_chapter_last(pg_temp.code_of('A'), true)) ->> 'outcome', 'not_active', 'denied: teen_17 (read-only in March) can''t use the switch');
select pg_temp.sign_out();
select throws_ok($$ select public.set_chapter_last('abcdefgh', true) $$, '42501', null, 'a visitor can''t call set_chapter_last()');
reset role;

-- 11. One live mark, and the backfill.
select throws_ok($$ update public.chapters set is_last = true where story_id = '00000000-0000-4000-9000-000000000001' $$,
  '23505', null, 'a story never has two live marks');
update public.stories set completion_status = 'completed' where id = '00000000-0000-4000-9000-000000000001';
select is(public.mark_completed_stories_last(), 1, 'the backfill marks the Completed story');
select is(pg_temp.marked(), 'A', 'on its published chapter with the highest position (A, after the reorder)');

-- 12. What readers see.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(((public.get_chapter('statia-meteo-seed01', pg_temp.code_of('A'))) ->> 'last_chapter_number')::integer, 2,
  'a reader gets "of 2" with the chapter');
select is(((public.get_story_page('statia-meteo-seed01')) ->> 'last_chapter_number')::integer, 2,
  'and on the story page');

select * from finish();
rollback;
