-- Database tests for the story-level Like and the public reads total (bundle 2, board B01;
-- Robert pressed "As drawn on the canvas", 24 Nov 2026; CLAUDE.md rules 1, 15 and 18).
-- What it proves:
-- - like_story() likes and unlikes a story by its address and the count follows; liking twice
--   changes nothing;
-- - story_like_state() gives a visitor the count with liked false, and liked only for the caller;
-- - a visitor and a read-only account can't like; a read-only account can take a like back;
-- - the writer can't like their own story; a story the reader may not see can't be liked;
-- - a like on a translation lands on the first edition, so every edition shows one total;
-- - a deleted account's like stops counting;
-- - get_story_page() answers stats.likes from story likes only (chapter likes stay on their
--   chapters) and stats.reads, the public reads total;
-- - policy story_likes_select_own: the reader reads their own like (allowed); the writer and
--   another member read none (denied); nobody writes the table directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- adult_writer's (…01) two seed stories get a published chapter each; the second is made 16+.
-- The first chapter was opened 7 times today and 5 times yesterday, and has one chapter like.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'slika001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'slikb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
insert into public.chapter_reads (chapter_id, read_on, total)
  select id, current_date, 7 from public.chapters where code = 'slika001'
  union all
  select id, current_date - 1, 5 from public.chapters where code = 'slika001';
insert into public.chapter_likes (user_id, chapter_id)
  select '00000000-0000-4000-8000-000000000015', id from public.chapters where code = 'slika001';

/* ---------- 1. A visitor sees the count but can't like ---------- */

select pg_temp.sign_out();
select is(public.story_like_state('statia-meteo-seed01'), '{"liked": false, "like_count": 0}'::jsonb,
  'a visitor sees 0 likes: the chapter like doesn''t count on the story');
select throws_ok($$ select public.like_story('statia-meteo-seed01', true) $$, '42501', null,
  'a visitor can''t like a story');
select is((public.get_story_page('statia-meteo-seed01') #>> '{stats,reads}')::integer, 12,
  'the story page shows its reads total to everyone');

/* ---------- 2. A member likes, twice changes nothing, then takes it back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.like_story('statia-meteo-seed01', true), '{"liked": true, "like_count": 1}'::jsonb,
  'teacher likes the story and the count is 1');
select is(public.like_story('statia-meteo-seed01', true) ->> 'like_count', '1', 'liking twice changes nothing');
select is((public.get_story_page('statia-meteo-seed01') #>> '{stats,likes}')::integer, 1,
  'the stats line counts the story like');
select is((select count(*)::integer from public.story_likes), 1,
  'policy story_likes_select_own: teacher reads their own like (allowed)');
select throws_ok($$ insert into public.story_likes (user_id, story_id)
    values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9000-000000000002') $$, '42501', null,
  'nobody writes the table directly');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.like_story('statia-meteo-seed01', true) ->> 'like_count', '2', 'blocker likes it too: 2');
select is(public.story_like_state('statia-meteo-seed01') ->> 'liked', 'true', 'and is told they like it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.story_like_state('statia-meteo-seed01') ->> 'liked', 'false', 'pending_check sees liked false');

/* ---------- 3. The writer and the table's other readers ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.like_story('statia-meteo-seed01', true) $$, '42501', null,
  'the writer can''t like their own story');
select is((select count(*)::integer from public.story_likes), 0,
  'policy story_likes_select_own: the writer reads none of the likes (denied)');

/* ---------- 4. A read-only account takes a like back but can't like ---------- */

-- teen_17 (…02) is read-only while the test is adults only; a like made earlier is put in by hand.
reset role;
insert into public.story_likes (user_id, story_id)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.like_story('statia-meteo-seed01', false), '{"liked": false, "like_count": 2}'::jsonb,
  'teen_17 (read-only) takes an old like back');
select throws_ok($$ select public.like_story('statia-meteo-seed01', true) $$, '42501', null,
  'but can''t like again');

/* ---------- 5. A story the reader may not see ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.story_like_state('the-girl-who-fixed-radios-seed02'), null, 'kid_14_ok gets nothing for a 16+ story');
select throws_ok($$ select public.like_story('the-girl-who-fixed-radios-seed02', true) $$, 'P0002', null,
  'and can''t like it');

/* ---------- 6. Editions share one total; deleted accounts stop counting ---------- */

reset role;
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure,
  edition_of_story_id, first_published_at, last_chapter_published_at)
values ('00000000-0000-4000-9000-0000000004e1', '00000000-0000-4000-8000-000000000001', 'weather-station-t400',
  'The weather station', 'A translation.', 'en', (select category_id from public.stories
    where id = '00000000-0000-4000-9000-000000000001'), 'all_ages', 'no_ai',
  '00000000-0000-4000-9000-000000000001', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, translation_of_chapter_id)
select '00000000-0000-4000-9000-0000000004e1', '00000000-0000-4000-8000-000000000001', 'slike001', 1, 'One',
  'x', 3, 'published', 'One', 'The first chapter.', 3, now(), id
from public.chapters where code = 'slika001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.like_story('weather-station-t400', true) ->> 'like_count', '3',
  'pending_check likes the translation and the count is the whole story''s: 3');
reset role;
select is((select story_id from public.story_likes where user_id = '00000000-0000-4000-8000-000000000005'),
  '00000000-0000-4000-9000-000000000001'::uuid, 'the like sits on the first edition');
select is(public.story_like_total('00000000-0000-4000-9000-000000000001'), 3, 'the first edition shows 3');
update public.profiles set deleted_at = now() where id = '00000000-0000-4000-8000-000000000015';
select is(public.story_like_total('00000000-0000-4000-9000-0000000004e1'), 2,
  'the edition shows the same total, without the deleted account''s like');

/* ---------- 7. The app can't call the counting helpers ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.story_read_total('00000000-0000-4000-9000-000000000001') $$, '42501', null,
  'the app can''t call story_read_total() directly');

select * from finish();
rollback;
