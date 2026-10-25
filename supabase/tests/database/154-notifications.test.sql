-- Database tests for in-app notifications (story S1-E7-01; board 6.2; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - a followed writer's new chapter reaches their followers once the job runs, and not the writer
--   (criterion 1);
-- - a new comment tells the writer, a reply tells the comment's author;
-- - several reactions on one comment within the hour are one notification counting the people
--   (criterion 2); new followers group the same way;
-- - the unread count and "Mark all as read" (criterion 3);
-- - a decided case gives the item's owner a decision that is is_required (criterion 4);
-- - a reader too young for the story's rating, or blocked either way, isn't shown the row;
-- - no answer carries a user ID;
-- - policy notifications_select_own: the person told reads their own row (allowed), nobody else
--   reads it (denied), and nobody writes the table directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- A row count read as the test's owner, whatever the policies say.
create function pg_temp.rows_for(persona_id uuid, wanted_kind text) returns integer
language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id and notifications.kind::text = wanted_kind;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- adult_writer's (…01) first seed story gets a published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'notif001', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. A new chapter reaches the followers ---------- */

-- teacher (…07) and blocker (…15) follow adult_writer; that is also two new followers for them.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.follow_writer('adult_writer', true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.follow_writer('adult_writer', true);
-- teen_17 (…02) already follows adult_writer and the story in the seed, so they joined the
-- writer's followers notification when the seed ran.
reset role;

select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000001', 'new_follower'), 1,
  'new followers within a day are one notification for the writer');
select is((select actor_count from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'new_follower'), 3,
  'counting each person once: the seed''s teen_17 and the two new ones');

insert into public.jobs (kind, payload) values ('chapter_published', jsonb_build_object(
  'chapter_id', (select id from public.chapters where code = 'notif001'),
  'story_id', '00000000-0000-4000-9000-000000000001'));
select ok(public.run_notification_jobs() >= 1, 'the notification job handles the queued chapter');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'new_chapter'), 1,
  'the follower is told about the new chapter (criterion 1)');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000001', 'new_chapter'), 0,
  'the writer isn''t told about their own chapter');
select is((select count(*)::integer from public.jobs
           where kind = 'chapter_published' and processed_at is null), 0,
  'and the job is marked done');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_notifications() #>> '{notifications,0,kind}', 'new_chapter',
  'my_notifications() lists it');
select is(public.my_notifications() #>> '{notifications,0,actors,0,handle}', 'adult_writer',
  'with the writer''s username');
select is(public.my_notifications() #>> '{notifications,0,chapter,code}', 'notif001',
  'and the chapter to open');
select ok(public.my_notifications()::text !~ '00000000-0000-4000-8000',
  'and no user ID anywhere in the answer');

/* ---------- 2. Comments, replies and grouped reactions ---------- */

insert into named select 'comment', (public.post_comment('statia-meteo-seed01', 'notif001',
  'Un comentariu.') ->> 'id')::uuid;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'reply', (public.post_comment('statia-meteo-seed01', 'notif001',
  'Mulțumesc!', false, (select id from named where label = 'comment')) ->> 'id')::uuid;
reset role;
select public.run_notification_jobs();
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000001', 'comment_on_chapter'), 1,
  'a new comment tells the writer');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'comment_reply'), 1,
  'a reply tells the comment''s author');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.react_to_comment((select id from named where label = 'comment'), 'heart');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.react_to_comment((select id from named where label = 'comment'), 'fire');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'comment_reactions'), 1,
  'two reactions within the hour are one notification (criterion 2)');
select is((select (n ->> 'actor_count')::integer from jsonb_array_elements(public.my_notifications() -> 'notifications') as n
           where n ->> 'kind' = 'comment_reactions'), 2,
  'counting both people');

/* ---------- 3. Unread and Mark all as read ---------- */

select is(public.my_unread_notification_count(), 3,
  'the badge counts the unread chapter, reply and reactions (criterion 3)');
select is(public.mark_notifications_read(), 0, 'Mark all as read leaves none unread');
select is((public.my_notifications() ->> 'unread')::integer, 0, 'and the list agrees');

/* ---------- 4. Ratings and blocks ---------- */

-- The story becomes 18+: teen_17 has a row, but isn't shown it.
reset role;
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.my_notifications() -> 'counts' ->> 'stories')::integer, 0,
  'a reader too young for the story''s new rating isn''t shown its chapter');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000001';
-- blocker blocks adult_writer: the chapter's notification goes from their list.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((public.my_notifications() -> 'counts' ->> 'stories')::integer, 1, 'before a block it is there');
select public.set_block('adult_writer', true);
select is((public.my_notifications() -> 'counts' ->> 'stories')::integer, 0,
  'after blocking the writer it isn''t');

/* ---------- 5. A moderation decision ---------- */

reset role;
insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
values ('R-990001', '00000000-0000-4000-8000-000000000007', 'comment',
  (select id from named where label = 'comment'), 'report', 'two_days', now() + interval '2 days');
update public.cases set status = 'decided', decision = 'no_action', decided_at = now(),
  decided_by_user_id = '00000000-0000-4000-8000-000000000010' where reference = 'R-990001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select n ->> 'is_required' from jsonb_array_elements(public.my_notifications() -> 'notifications') as n
           where n ->> 'kind' = 'moderation_decision'), 'true',
  'the item''s owner is told about the decision, and it can''t be switched off (criterion 4)');

/* ---------- 6. The policy ---------- */

select is((select count(*)::integer from public.notifications where user_id = '00000000-0000-4000-8000-000000000007'),
  pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'new_chapter')
  + pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'comment_reply')
  + pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'comment_reactions')
  + pg_temp.rows_for('00000000-0000-4000-8000-000000000007', 'moderation_decision'),
  'allowed: notifications_select_own, the person told reads their own rows');
select is((select count(*)::integer from public.notifications where user_id <> '00000000-0000-4000-8000-000000000007'), 0,
  'denied: notifications_select_own, nobody reads anyone else''s');
select throws_ok($$ insert into public.notifications (user_id, kind) values ('00000000-0000-4000-8000-000000000007', 'new_follower') $$,
  '42501', null, 'nobody writes the table directly');

select * from finish();
rollback;
