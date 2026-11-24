-- Database tests for the end of a story (BOOKS B06, user story 2.6, board B06-ReaderLast).
-- What it proves:
-- - a chapter that isn't marked as the last tells followers 'new_chapter', as before;
-- - the chapter the writer marked as the last tells each follower once, with 'story_completed'
--   and no 'new_chapter' row (story 2.6: "Followers get one notification");
-- - the writer isn't told about their own story;
-- - story_completed sits under Stories and follows the reader's new-chapter email choice.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- A row count read as the test's owner, whatever the policies say.
create function pg_temp.rows_for(persona_id uuid, wanted_kind text) returns integer
language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id and notifications.kind::text = wanted_kind;
$$;

-- adult_writer's (…01) first seed story gets two published chapters; the second is the last.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, is_last)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'endst001', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol.', 3, now(), false),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'endst002', 2,
   'Doi', 'x', 3, 'published', 'Doi', 'Ultimul capitol.', 3, now(), true);
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

-- teacher (…07) follows adult_writer; teen_17 (…02) follows the writer and the story in the seed.
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
delete from public.notifications where kind in ('new_chapter', 'story_completed');

/* ---------- 1. A chapter that isn't the last ---------- */

insert into public.jobs (kind, payload) values ('chapter_published', jsonb_build_object(
  'chapter_id', (select id from public.chapters where code = 'endst001'),
  'story_id', '00000000-0000-4000-9000-000000000001'));
select ok(public.run_notification_jobs() >= 1, 'the job handles the first chapter');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'new_chapter'), 1,
  'a chapter that isn''t the last tells a follower about a new chapter');

/* ---------- 2. The last chapter ---------- */

delete from public.notifications where kind = 'new_chapter';
insert into public.jobs (kind, payload) values ('chapter_published', jsonb_build_object(
  'chapter_id', (select id from public.chapters where code = 'endst002'),
  'story_id', '00000000-0000-4000-9000-000000000001'));
select ok(public.run_notification_jobs() >= 1, 'the job handles the last chapter');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'story_completed'), 1,
  'the last chapter tells a follower the story is finished (story 2.6)');
select is(
  pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'new_chapter')
    + pg_temp.rows_for('00000000-0000-4000-8000-000000000002', 'new_chapter'),
  0, 'and no new-chapter row as well: followers hear once');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000001', 'story_completed'), 0,
  'the writer isn''t told about their own story');

/* ---------- 3. Where it sits and how it is emailed ---------- */

select is(public.notification_category('story_completed'), 'stories',
  'the end of a story sits under Stories');
insert into public.notification_email_settings (user_id, kind, delivery)
values ('00000000-0000-4000-8000-000000000007', 'new_chapter', 'off')
on conflict (user_id, kind) do update set delivery = 'off';
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000007', 'story_completed'), 'off',
  'it follows the reader''s email choice for new chapters');

select * from finish();
rollback;
