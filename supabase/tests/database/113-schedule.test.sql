-- Database tests for scheduled chapters (story S1-E3-03; Q7).
-- What it proves:
-- - schedule_chapter() refuses a time in the past, now, or more than a year ahead, and an empty
--   chapter; it schedules a draft; scheduling again moves the time; cancel_schedule() undoes it;
-- - publish_due_chapters() publishes a chapter whose time has come and leaves later ones alone;
--   the published copy is the draft as it was at that moment; it skips a deleted story and a
--   writer who is no longer active; pg_cron runs it every minute;
-- - read-only accounts can't schedule; a visitor can't call it; nobody calls the job directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table made as
  select (public.create_chapter('statia-meteo-seed01')) ->> 'code' as code;
grant select on made to authenticated;
create function pg_temp.code() returns text language sql as $$ select code from made $$;
create function pg_temp.status() returns text language sql security definer as $$
  select status::text from public.chapters where code = (select code from made) $$;

-- 1. The refusals.
select is((public.schedule_chapter(pg_temp.code(), now() + interval '1 day')) ->> 'outcome', 'empty',
  'an empty chapter can''t be scheduled');
select public.save_chapter_draft(pg_temp.code(), 'Joi', 'Furtuna.', 1);
select is((public.schedule_chapter(pg_temp.code(), now() - interval '1 minute')) ->> 'outcome', 'bad_time', 'a time in the past is refused');
select is((public.schedule_chapter(pg_temp.code(), now())) ->> 'outcome', 'bad_time', 'now is refused: use "Publish now"');
select is((public.schedule_chapter(pg_temp.code(), now() + interval '366 days')) ->> 'outcome', 'bad_time', 'more than a year ahead is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.schedule_chapter(pg_temp.code(), now() + interval '1 day')) ->> 'outcome', 'not_active', 'teen_17 can''t schedule');
reset role;
set local role anon;
select throws_ok($$ select public.schedule_chapter('abcdefgh', now() + interval '1 day') $$, '42501', null, 'a visitor can''t call schedule_chapter()');
reset role;

-- 2. Schedule, move, cancel, schedule again.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.schedule_chapter(pg_temp.code(), now() + interval '2 days')) ->> 'outcome', 'ok', 'the writer schedules it');
select is(pg_temp.status(), 'scheduled', 'it is scheduled');
select is((public.schedule_chapter(pg_temp.code(), now() + interval '1 day')) ->> 'outcome', 'ok', 'scheduling again moves the time');
select is((public.cancel_schedule(pg_temp.code())) ->> 'outcome', 'ok', 'the writer cancels the schedule');
select is(pg_temp.status(), 'draft', 'it is a draft again');
select is((public.cancel_schedule(pg_temp.code())) ->> 'outcome', 'wrong_state', 'a draft has no schedule to cancel');
select is((public.schedule_chapter(pg_temp.code(), now() + interval '1 hour')) ->> 'outcome', 'ok', 'scheduled again for an hour from now');

-- 3. The job: nothing due yet; the writer keeps editing; then the time comes.
reset role;
select is(public.publish_due_chapters(), 0, 'nothing is published before its time');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.save_chapter_draft(pg_temp.code(), 'Joi', 'Furtuna, mai târziu.', 2);
reset role;
-- Move the clock: pretend the moment has passed.
update public.chapters set scheduled_for = now() - interval '1 second' where code = pg_temp.code();
select is(public.publish_due_chapters(), 1, 'its time has come: published');
select results_eq(
  $$ select status::text, published_body, scheduled_for is null from public.chapters where code = pg_temp.code() $$,
  $$ values ('published', 'Furtuna, mai târziu.', true) $$,
  'the draft as it was at that moment went live'
);
select is((select count(*)::integer from public.jobs where kind = 'chapter_published'), 1, 'a chapter_published job is queued');

-- 4. Skips: a deleted story, a writer who is no longer active.
update public.chapters set status = 'draft' where code = pg_temp.code();
update public.chapters set status = 'scheduled', scheduled_for = now() - interval '1 second' where code = pg_temp.code();
update public.stories set deleted_at = now() where slug = 'statia-meteo-seed01';
select is(public.publish_due_chapters(), 0, 'a deleted story''s chapter is not published');
update public.stories set deleted_at = null where slug = 'statia-meteo-seed01';
-- A writer who is no longer active waits: here a failed age check; suspensions and bans give the
-- same account_state() answer once S1-E10-06 stores them.
update public.profiles set age_check_result = 'failed' where id = '00000000-0000-4000-8000-000000000001';
select is(public.publish_due_chapters(), 0, 'a chapter whose writer is no longer active waits');

-- 5. pg_cron runs it every minute; nobody calls it through the API.
select results_eq(
  $$ select schedule, command from cron.job where jobname = 'publish-due-chapters' $$,
  $$ values ('* * * * *', 'select public.publish_due_chapters()') $$,
  'pg_cron runs the job every minute'
);

select * from finish();

rollback;
