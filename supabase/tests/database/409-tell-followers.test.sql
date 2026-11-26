-- Database tests for "Tell followers" in the Publish dialog (board D06, user story 5.6).
-- What it proves:
-- - chapter_followers_to_tell() gives the writer the number of people a new chapter tells, the
--   same people new_chapter_audience() lists, and never counts the writer;
-- - another writer gets null, a visitor can't call it, and nobody but the database reads
--   new_chapter_audience() itself;
-- - publishing with tell_followers off queues the job with the choice and tells nobody;
--   publishing as before (the argument left out) tells followers;
-- - a scheduled chapter keeps the choice until its time comes;
-- - the number reads in a read-only transaction, as the API runs a stable function.
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

-- Read and run as the test's owner, whatever the policies say.
create function pg_temp.audience_size() returns integer language sql security definer as $$
  select count(*)::integer
  from public.new_chapter_audience('00000000-0000-4000-9000-000000000001') $$;
create function pg_temp.writer_in_audience() returns boolean language sql security definer as $$
  select '00000000-0000-4000-8000-000000000001'::uuid in (
    select public.new_chapter_audience('00000000-0000-4000-9000-000000000001')) $$;
create function pg_temp.new_chapter_rows() returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = '00000000-0000-4000-8000-000000000007' and notifications.kind = 'new_chapter' $$;
create function pg_temp.run_jobs() returns integer language sql security definer as $$
  select public.run_notification_jobs() $$;
-- The chapter_published job not yet handled (there is one at a time in this test).
create function pg_temp.last_job_tells() returns text language sql security definer as $$
  select payload ->> 'tell_followers' from public.jobs
  where kind = 'chapter_published' and processed_at is null $$;
create function pg_temp.publish_due() returns integer language sql security definer as $$
  select public.publish_due_chapters() $$;
create function pg_temp.make_due(chapter_code text) returns void language sql security definer as $$
  update public.chapters set scheduled_for = now() - interval '1 second' where code = chapter_code $$;

-- teacher (…07) follows adult_writer (…01); the seed story is public.
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
delete from public.notifications where kind in ('new_chapter', 'story_completed');
delete from public.jobs where kind = 'chapter_published';

-- Three chapters with words on adult_writer's seed story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table made as
  select (public.create_chapter('statia-meteo-seed01')) ->> 'code' as quiet_code,
         (public.create_chapter('statia-meteo-seed01')) ->> 'code' as loud_code,
         (public.create_chapter('statia-meteo-seed01')) ->> 'code' as later_code;
grant select on made to authenticated, anon;
create function pg_temp.quiet() returns text language sql as $$ select quiet_code from made $$;
create function pg_temp.loud() returns text language sql as $$ select loud_code from made $$;
create function pg_temp.later() returns text language sql as $$ select later_code from made $$;
select public.save_chapter_draft(pg_temp.quiet(), 'Liniște', 'Nimeni nu află.', 1);
select public.save_chapter_draft(pg_temp.loud(), 'Zgomot', 'Toți află.', 1);
select public.save_chapter_draft(pg_temp.later(), 'Mai târziu', 'Vine mâine.', 1);

/* ---------- 1. The number in the dialog ---------- */

select ok(public.chapter_followers_to_tell(pg_temp.quiet()) >= 1,
  'the writer sees how many followers a new chapter tells');
select is(public.chapter_followers_to_tell(pg_temp.quiet()), pg_temp.audience_size(),
  'the number is the people the chapter tells');
select is(pg_temp.writer_in_audience(), false, 'the writer is never counted or told');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.chapter_followers_to_tell(pg_temp.quiet()), null,
  'another writer gets no number for someone else''s chapter');
select throws_ok($$ select public.new_chapter_audience('00000000-0000-4000-9000-000000000001') $$,
  '42501', null, 'a member can''t list a story''s audience');
select pg_temp.sign_out();
select throws_ok($$ select public.chapter_followers_to_tell('anything') $$, '42501', null,
  'a visitor can''t call chapter_followers_to_tell()');

/* ---------- 2. Publishing with followers told or not ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.publish_chapter(pg_temp.quiet(), false, false)) ->> 'outcome', 'ok',
  'the writer publishes with Tell followers off');
select is(pg_temp.last_job_tells(), 'false', 'the job carries the choice');
select pg_temp.run_jobs();
select is(pg_temp.new_chapter_rows(), 0, 'and no follower is told');

select is((public.publish_chapter(pg_temp.loud())) ->> 'outcome', 'ok',
  'publishing as before leaves Tell followers on');
select pg_temp.run_jobs();
select is(pg_temp.new_chapter_rows(), 1, 'and the follower is told');

/* ---------- 3. A scheduled chapter keeps the choice ---------- */

select public.schedule_chapter(pg_temp.later(), now() + interval '1 day', false, false);
select pg_temp.make_due(pg_temp.later());
select pg_temp.publish_due();
select is(pg_temp.last_job_tells(), 'false',
  'a scheduled chapter goes out with the choice made when it was scheduled');

/* ---------- 4. The API reads the number in a read-only transaction ---------- */

-- The API runs a stable function read-only, so the number must not lock the chapter's row.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
set local transaction_read_only = on;
select ok(public.chapter_followers_to_tell(pg_temp.loud()) >= 1,
  'the number reads without locking the chapter, as the API asks');

select * from finish();
rollback;
