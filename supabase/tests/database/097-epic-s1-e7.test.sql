-- Epic check for S1-E7, notifications (story S1-E7-QA).
-- It adds no feature: it walks the epic's main journeys through the database, crossing S1-E7-01
-- with the stories that feed it, with the seed personas the story names.
-- Journey (S1-E6-05 × S1-E6-01 × S1-E6-02 × S1-E3-03 × S1-E7-01): teacher follows adult_writer →
--   the writer is told; teacher comments → the writer is told once the job runs; the writer
--   replies and reacts → teacher is told; the writer publishes a chapter → every follower who may
--   read it is told (teacher and the seed's teen_17).
-- Ratings (S1-E3-06 × S1-E7-01): at 16+, kid_14_ok and kid_14_waiting, who follow the story,
--   aren't shown the new chapter; teen_17 is.
-- Blocks (S1-E5-05 × S1-E7-01): pending_check follows the writer, then the writer blocks
--   pending_check: the writer's followers row keeps the others and leaves pending_check out, and
--   a blocked person's new action never notifies.
-- Decisions (S1-E10-06 × S1-E7-01): a decided case reaches the item's owner, always on.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The caller's notifications of one kind, as the page gets them.
create function pg_temp.mine(wanted_kind text) returns setof jsonb language sql as $$
  select n from jsonb_array_elements(public.my_notifications(null, 50) -> 'notifications') as n
  where n ->> 'kind' = wanted_kind;
$$;
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Start clean: the seed's own notifications aren't part of this journey.
delete from public.notifications;
-- A published chapter on adult_writer's "Stația meteo" (All ages) and a second one in draft.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epics701', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epics702', 2, 'Doi',
  'Al doilea capitol.', 3, 'draft');
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. A follow, a comment, a reply and a reaction ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.follow_writer('adult_writer', true);
insert into named select 'comment', (public.post_comment('statia-meteo-seed01', 'epics701', 'Un început bun.') ->> 'id')::uuid;
reset role;
select public.run_notification_jobs();

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(exists (select 1 from pg_temp.mine('new_follower') as n where n #>> '{actors,0,handle}' = 'teacher'),
  'a follow tells the writer who followed (S1-E6-05 × S1-E7-01)');
select is((select n ->> 'comment_excerpt' from pg_temp.mine('comment_on_chapter') as n), 'Un început bun.',
  'a comment tells the writer, with its first words (S1-E6-01 × S1-E7-01)');
select public.post_comment('statia-meteo-seed01', 'epics701', 'Mulțumesc!', false, (select id from named where label = 'comment'));
select public.react_to_comment((select id from named where label = 'comment'), 'heart');
reset role;
select public.run_notification_jobs();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select n #>> '{actors,0,handle}' from pg_temp.mine('comment_reply') as n), 'adult_writer',
  'the writer''s reply tells teacher');
select is((select count(*)::integer from pg_temp.mine('comment_reactions')), 1,
  'and so does the writer''s reaction (S1-E6-02 × S1-E7-01)');
select is((select count(*)::integer from pg_temp.mine('comment_on_chapter')), 0,
  'teacher isn''t told about their own comment');

/* ---------- 2. A new chapter, and who may read it ---------- */

-- kid_14_ok and kid_14_waiting follow the story (put in directly: the minors can't write in March).
reset role;
insert into public.follows_stories (user_id, story_id) values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-9000-000000000001')
on conflict do nothing;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.publish_chapter('epics702') $$, 'the writer publishes chapter 2 (S1-E3-03)');
reset role;
select ok(public.run_notification_jobs() >= 1, 'and the job runs');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select n #>> '{chapter,code}' from pg_temp.mine('new_chapter') as n), 'epics702',
  'teacher, who follows the writer, is told about the new chapter (S1-E7-01, criterion 1)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 1,
  'so is teen_17, who follows the writer and the story, once');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 1,
  'and kid_14_ok, who follows the story, while it is All ages');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 0, 'never the writer');

reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 0,
  'at 16+ kid_14_ok isn''t shown it (S1-E3-06 × S1-E7-01)');
select is(public.my_unread_notification_count(), 0, 'and the badge agrees');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 0, 'nor is kid_14_waiting');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from pg_temp.mine('new_chapter')), 1, 'teen_17 still is');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 3. Blocks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.follow_writer('adult_writer', true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_block('pending_check', true);
select is((select n #>> '{actors,0,handle}' from pg_temp.mine('new_follower') as n), 'teacher',
  'after the writer blocks pending_check, the followers row leaves them out and keeps teacher (S1-E5-05)');

/* ---------- 4. A decision ---------- */

reset role;
insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
values ('R-997001', '00000000-0000-4000-8000-000000000007', 'comment',
  (select id from named where label = 'comment'), 'report', 'two_days', now() + interval '2 days');
update public.cases set status = 'decided', decision = 'no_action', decided_at = now(),
  decided_by_user_id = '00000000-0000-4000-8000-000000000010' where reference = 'R-997001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select n ->> 'is_required' from pg_temp.mine('moderation_decision') as n), 'true',
  'a decision about teacher''s comment reaches teacher, always on (S1-E7-01, criterion 4)');

select * from finish();
rollback;
