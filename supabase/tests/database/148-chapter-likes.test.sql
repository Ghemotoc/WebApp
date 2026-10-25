-- Database tests for liking a chapter (story S1-E6-03; CLAUDE.md rules 1 and 18).
-- What it proves:
-- - like_chapter() toggles a like by the chapter's address and the count updates; liking twice
--   changes nothing (first criterion);
-- - chapter_like_state() gives everyone the public count, and liked only for the caller;
-- - a visitor and a read-only account can't like; a read-only account can take a like back;
-- - a chapter the reader may not read (16+ for kid_14_ok, a blocked writer) can't be liked;
-- - chapter_like_totals() feeds the popularity job, without the writer's own like (second
--   criterion), and the app can't call it;
-- - get_chapter() now answers the chapter's row ID for the Report button, and still no user ID;
-- - policy chapter_likes_select_own: the reader reads their own like (allowed); the writer and
--   another member read none (denied); nobody writes the table directly.
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

-- adult_writer's (…01) two seed stories get a published chapter each; the second is made 16+.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'likea001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'likeb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
-- The first chapter's row ID, read now, while no reader's rules apply.
create temporary table first_chapter on commit drop as select id from public.chapters where code = 'likea001';
grant select on first_chapter to authenticated;

/* ---------- 1. Like, unlike, the count ---------- */

-- teacher (…07) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.chapter_like_state('statia-meteo-seed01', 'likea001'), '{"liked": false, "like_count": 0}'::jsonb,
  'before: no likes, and teacher hasn''t liked it');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', true), '{"liked": true, "like_count": 1}'::jsonb,
  'teacher taps Like: the like is on and the count is 1');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', true) ->> 'like_count', '1', 'liking twice changes nothing');
select is(public.chapter_like_state('statia-meteo-seed01', 'likea001'), '{"liked": true, "like_count": 1}'::jsonb,
  'the state says liked');

-- blocker (…15), another active adult, likes it too.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', true) ->> 'like_count', '2', 'a second reader''s like counts');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', false), '{"liked": false, "like_count": 1}'::jsonb,
  'tapping again takes the like back and the count goes down');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'nochap01', true) $$, 'P0002', null,
  'an unknown chapter is refused');

/* ---------- 2. Visitors and read-only accounts ---------- */

select pg_temp.sign_out();
select is(public.chapter_like_state('statia-meteo-seed01', 'likea001'), '{"liked": false, "like_count": 1}'::jsonb,
  'a visitor sees the public count');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'likea001', true) $$, '42501', null,
  'a visitor can''t like');

-- teen_17 (…02) is read-only while the test is adults only; a like made earlier is put in by hand.
reset role;
insert into public.chapter_likes (user_id, chapter_id)
select '00000000-0000-4000-8000-000000000002', id from public.chapters where code = 'likea001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'likea001', true) $$, '42501', null,
  'a read-only account can''t like (the account gate)');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', false) ->> 'liked', 'false',
  'but it can take a like back');

/* ---------- 3. Ratings and blocks ---------- */

-- kid_14_ok (…03) can't read a 16+ story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.chapter_like_state('the-girl-who-fixed-radios-seed02', 'likeb001'), null,
  'a 16+ chapter has no like state for a 14-year-old (rule 18)');
select throws_ok($$ select public.like_chapter('the-girl-who-fixed-radios-seed02', 'likeb001', false) $$, 'P0002', null,
  'and can''t be liked or unliked by them');

-- adult_writer blocks teacher: teacher can no longer reach the chapter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.set_block('teacher', true) $$, 'adult_writer blocks teacher');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'likea001', true) $$, 'P0002', null,
  'a chapter by someone who blocks you can''t be liked, and looks missing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.set_block('teacher', false) $$, 'and unblocks again');

/* ---------- 4. The popularity job ---------- */

-- The writer likes their own chapter: it counts on screen, not for the job.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.like_chapter('statia-meteo-seed01', 'likea001', true) ->> 'like_count', '2',
  'the writer may like their own chapter, and the screen counts it');
select throws_ok($$ select * from public.chapter_like_totals() $$, '42501', null,
  'the app can''t call the job''s totals');
reset role;
select results_eq(
  $$ select like_count, likes_last_7_days from public.chapter_like_totals()
     where chapter_id = (select id from public.chapters where code = 'likea001') $$,
  $$ values (1, 1) $$,
  'the job reads 1 like (blocker''s), leaving out the writer''s own');

/* ---------- 5. get_chapter() and the policy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('statia-meteo-seed01', 'likea001') ->> 'id',
  (select id::text from first_chapter),
  'get_chapter() answers the chapter''s row ID, for Report chapter');
select ok(public.get_chapter('statia-meteo-seed01', 'likea001')::text not like '%00000000-0000-4000-8000-%',
  'and never a user ID');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.chapter_likes), 1,
  'allowed: chapter_likes_select_own, the reader reads their own like');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.chapter_likes where user_id <> '00000000-0000-4000-8000-000000000001'), 0,
  'denied: chapter_likes_select_own, the writer reads nobody else''s like');
select throws_ok($$ insert into public.chapter_likes (user_id, chapter_id)
    select '00000000-0000-4000-8000-000000000001', id from public.chapters where code = 'likeb001' $$,
  '42501', null, 'nobody writes likes directly');

select * from finish();
rollback;
