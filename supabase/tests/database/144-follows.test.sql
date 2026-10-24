-- Database tests for following writers and stories (story S1-E6-05; CLAUDE.md rules 1 and 6; Q50).
-- What it proves:
-- - follow_writer() and follow_story() follow and unfollow by username and address, at any time;
--   doing it twice changes nothing; nobody follows themselves (first criterion);
-- - the follower count is public (visitors see it) but only the writer reads the list,
--   through my_followers() (second criterion, Q50);
-- - a blocked pair: following fails silently, with "not following" and no error; a writer who
--   blocks the caller looks like an unknown username; blocking ends follows both ways (third
--   criterion; rule 6);
-- - a read-only account can't follow but can unfollow; a visitor can do neither;
-- - a story the reader may not see (16+ for kid_14_ok) can't be followed;
-- - policies follows_users_select_own and follows_stories_select_own: the follower reads their
--   own rows (allowed); the writer and a third member read none (denied); no direct writes.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- adult_writer's (…01) two seed stories get a published chapter each; the second is made 16+.
-- The seed has teen_17 (…02) following adult_writer and "Stația meteo".
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'folwa001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'folwb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';

/* ---------- 1. Follow and unfollow ---------- */

-- teacher (…07) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.writer_follow_state('adult_writer'), '{"following": false, "follower_count": 1}'::jsonb,
  'before: one follower (teen_17, from the seed), and teacher doesn''t follow');
select is(public.follow_writer('adult_writer', true), '{"following": true, "follower_count": 2}'::jsonb,
  'teacher follows adult_writer by username');
select is(public.follow_writer('@adult_writer', true) ->> 'follower_count', '2', 'following twice changes nothing');
select ok((public.writer_follow_state('adult_writer') ->> 'following')::boolean, 'the state says following');
select is(public.follow_writer('adult_writer', false), '{"following": false, "follower_count": 1}'::jsonb,
  'and unfollows at any time');
select throws_ok($$ select public.follow_writer('teacher', true) $$, '23514', null, 'nobody follows themselves');
select throws_ok($$ select public.follow_writer('no_such_writer', true) $$, 'P0002', null, 'an unknown username is refused');

select is(public.follow_story('statia-meteo-seed01', true), '{"following": true, "follower_count": 2}'::jsonb,
  'teacher follows a story by its address');
select is(public.story_follow_state('statia-meteo-seed01'), '{"following": true, "follower_count": 2}'::jsonb,
  'the story''s state says following, with the count');
select is(public.follow_story('statia-meteo-seed01', false) ->> 'following', 'false', 'and unfollows it');
select throws_ok($$ select public.follow_story('no-such-story-x1', true) $$, 'P0002', null, 'an unknown story is refused');

/* ---------- 2. The count is public, the list is the writer's ---------- */

select pg_temp.sign_out();
select is(public.writer_follow_state('adult_writer') ->> 'follower_count', '1', 'a visitor sees the follower count');
select is(public.writer_follow_state('adult_writer') ->> 'following', 'false', 'and follows nobody');
select throws_ok($$ select public.follow_writer('adult_writer', true) $$, '42501', null, 'a visitor can''t follow');
select throws_ok($$ select * from public.my_followers() $$, '42501', null, 'a visitor can''t ask for a list');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select results_eq($$ select handle from public.my_followers() $$, $$ values ('teen_17') $$,
  'the writer reads their own followers by username');
select ok((select count(*) from public.my_followers() as follower where follower::text like '%00000000-%') = 0,
  'without user IDs');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.my_followers()), 0,
  'another member asking gets only their own (empty) list, never the writer''s');

-- Policies: the follower reads their own rows; the writer and a third member read none.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.follows_users), 1, 'allowed: follows_users_select_own, the follower reads their own row');
select is((select count(*)::integer from public.follows_stories), 1, 'allowed: follows_stories_select_own, the follower reads their own row');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.follows_users), 0, 'denied: follows_users_select_own, the writer followed reads nothing');
select is((select count(*)::integer from public.follows_stories), 0, 'denied: follows_stories_select_own, the story''s writer reads nothing');
select throws_ok($$ insert into public.follows_users (user_id, followed_user_id)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007') $$,
  '42501', null, 'nobody writes follows directly');

/* ---------- 3. The account gate and ratings ---------- */

-- kid_14_ok (…03) is read-only while the test is adults only, and can't see 16+.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.follow_writer('adult_writer', true) $$, '42501', null, 'a read-only account can''t follow');
select throws_ok($$ select public.follow_story('the-girl-who-fixed-radios-seed02', true) $$, 'P0002', null,
  'a story the reader may not see can''t be followed (rule 18)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.follow_writer('adult_writer', false) ->> 'following', 'false', 'a read-only account can still unfollow');

/* ---------- 4. Blocks ---------- */

-- blocker (…15) blocks blocked (…16) in the seed. blocked is read-only (17), so the silent
-- failure is shown with blocker following blocked, whom they block.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.follow_writer('blocked', true), '{"following": false, "follower_count": 0}'::jsonb,
  'following someone you block silently does nothing: no error, "not following"');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.writer_follow_state('blocker'), null, 'a writer who blocks you has no follow state to show');
select throws_ok($$ select public.follow_writer('blocker', true) $$, 'P0002', null,
  'and looks like an unknown username, so the block isn''t revealed');

-- teacher follows adult_writer and their story; adult_writer then blocks teacher: both follows end.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ select public.follow_writer('adult_writer', true), public.follow_story('statia-meteo-seed01', true) $$,
  'teacher follows adult_writer and a story of theirs');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.set_block('teacher', true) $$, 'adult_writer blocks teacher');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.follows_users) + (select count(*)::integer from public.follows_stories), 0,
  'blocking ended teacher''s follows of the writer and the story');

select * from finish();
rollback;
