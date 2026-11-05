-- QA-1b: a story's pictures and notifications follow its rating (independent QA check,
-- 5 Nov 2026, findings C1 and C2; CLAUDE.md rule 18).
--
-- What it proves:
-- - picture_is_visible() (the Storage rules *_select_visible): a passed cover and a passed chapter
--   picture of a 16+ story are served to an adult reader (allowed) and refused to a 14-year-old
--   and to a signed-out visitor (denied); someone blocked with the writer is refused too.
-- - The writer still reads their own story's pictures through picture_reader_may_see().
-- - A picture that belongs to no story (an avatar) is unchanged: anyone may see it once it passed.
-- - notification_is_shown(): a notification about a story rated above the person's age is hidden,
--   one about a story they may see shows, and a writer's notification about their own story always
--   shows; my_unread_notification_count() agrees.
-- Personas: adult_writer (…01, the writer), kid_14_ok (…03, 13 to 15), teacher (…07, an adult
-- reader), blocker (…15) who blocks blocked (…16). Seed story …9000…01 by adult_writer, all ages,
-- raised to 16+ here. Test data is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- notification_is_shown() is internal, so it is called as postgres with a member's claims:
-- auth.uid() is still that member.
create function pg_temp.server_for(persona_id text) returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Test data, written as postgres ---------- */

-- Story 1 becomes a 16+ story with an uploaded cover and a chapter with a picture.
update public.stories set rating = '16_plus', cover_kind = 'upload', cover_design = null,
  cover_background = null, cover_accent = null,
  cover_tall_path = '00000000-0000-4000-9000-000000000001/qa293-tall.webp',
  cover_square_path = '00000000-0000-4000-9000-000000000001/qa293-square.webp'
where id = '00000000-0000-4000-9000-000000000001';
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'qa293ch1', 1,
  'Unu', 'Prima frază.', 2);
insert into public.picture_checks (user_id, bucket, path, kind, story_id, chapter_id, status)
values
  ('00000000-0000-4000-8000-000000000001', 'covers',
   '00000000-0000-4000-9000-000000000001/qa293-tall.webp', 'cover',
   '00000000-0000-4000-9000-000000000001', null, 'passed'),
  ('00000000-0000-4000-8000-000000000001', 'chapter-images', 'qa293/picture.webp', 'chapter_picture',
   '00000000-0000-4000-9000-000000000001',
   (select id from public.chapters where code = 'qa293ch1'), 'passed'),
  ('00000000-0000-4000-8000-000000000001', 'avatars', 'qa293/avatar.webp', 'avatar', null, null, 'passed');
-- blocked (…16) writes a story with a passed cover, so blocker (…15) can be tested.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id)
values ('00000000-0000-4000-9000-000000000293', '00000000-0000-4000-8000-000000000016',
  'Blocked writer', 'blocked-writer-qa293', 'all_ages', 'ro', (select id from public.categories limit 1));
insert into public.picture_checks (user_id, bucket, path, kind, story_id, status)
values ('00000000-0000-4000-8000-000000000016', 'covers',
  '00000000-0000-4000-9000-000000000293/qa293-cover.webp', 'cover',
  '00000000-0000-4000-9000-000000000293', 'passed');
-- Notifications about story 1 for the 14-year-old, the adult reader and the writer.
insert into public.notifications (user_id, kind, story_id)
values ('00000000-0000-4000-8000-000000000003', 'story_finished', '00000000-0000-4000-9000-000000000001'),
       ('00000000-0000-4000-8000-000000000007', 'story_finished', '00000000-0000-4000-9000-000000000001'),
       ('00000000-0000-4000-8000-000000000001', 'story_finished', '00000000-0000-4000-9000-000000000001');
create temp table qa293_notifications as
  select user_id, id from public.notifications where story_id = '00000000-0000-4000-9000-000000000001'
    and kind = 'story_finished';

/* ---------- Pictures follow the story's rating ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.picture_is_visible('covers', '00000000-0000-4000-9000-000000000001/qa293-tall.webp'),
  'allowed: an adult reader sees the cover of a 16+ story');
select ok(public.picture_is_visible('chapter-images', 'qa293/picture.webp'),
  'allowed: an adult reader sees a chapter picture of a 16+ story');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(not public.picture_is_visible('covers', '00000000-0000-4000-9000-000000000001/qa293-tall.webp'),
  'denied: a 14-year-old can''t fetch the cover of a 16+ story from Storage');
select ok(not public.picture_is_visible('chapter-images', 'qa293/picture.webp'),
  'denied: a 14-year-old can''t fetch a chapter picture of a 16+ story');
select ok(public.picture_is_visible('avatars', 'qa293/avatar.webp'),
  'allowed: a picture that belongs to no story is unchanged');

select pg_temp.as_visitor();
select ok(not public.picture_is_visible('covers', '00000000-0000-4000-9000-000000000001/qa293-tall.webp'),
  'denied: a signed-out visitor can''t fetch the cover of a 16+ story');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok(not public.picture_is_visible('covers', '00000000-0000-4000-9000-000000000293/qa293-cover.webp'),
  'denied: someone who blocked the writer doesn''t get the writer''s cover');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.picture_is_visible('covers', '00000000-0000-4000-9000-000000000293/qa293-cover.webp'),
  'allowed: anyone else gets that all-ages cover');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.picture_reader_may_see('chapter-images', 'qa293/picture.webp'),
  'the writer still reads their own story''s pictures (picture_reader_may_see)');

/* ---------- Notifications follow the story's rating ---------- */

select pg_temp.server_for('00000000-0000-4000-8000-000000000003');
select ok(not public.notification_is_shown(notifications.*), 'a 14-year-old''s notification about a 16+ story is hidden')
from public.notifications
where id = (select id from qa293_notifications where user_id = '00000000-0000-4000-8000-000000000003');
-- Remember the 14-year-old's unread count while the story is 16+ (seed rows may add to it).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
create temp table qa293_unread as select public.my_unread_notification_count() as unread;

select pg_temp.server_for('00000000-0000-4000-8000-000000000007');
select ok(public.notification_is_shown(notifications.*), 'an adult''s notification about a 16+ story shows')
from public.notifications
where id = (select id from qa293_notifications where user_id = '00000000-0000-4000-8000-000000000007');

-- A 14-year-old may see a 13+ story, so the notification shows again once the rating comes down.
select pg_temp.server_for('00000000-0000-4000-8000-000000000003');
select set_config('role', 'postgres', true);
update public.stories set rating = '13_plus' where id = '00000000-0000-4000-9000-000000000001';
select ok(public.notification_is_shown(notifications.*), 'the same notification shows once the story is 13+')
from public.notifications
where id = (select id from qa293_notifications where user_id = '00000000-0000-4000-8000-000000000003');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.my_unread_notification_count(), (select unread + 1 from qa293_unread),
  'while the story was 16+ the notification wasn''t counted as unread; now it is');
select set_config('role', 'postgres', true);

-- A writer's notification about their own story shows whatever its rating.
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.server_for('00000000-0000-4000-8000-000000000001');
select ok(public.notification_is_shown(notifications.*), 'a writer always sees notifications about their own story')
from public.notifications
where id = (select id from qa293_notifications where user_id = '00000000-0000-4000-8000-000000000001');

select * from finish();
rollback;
