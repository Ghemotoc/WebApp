-- Database tests for popularity ranking (story S1-E5-03, with S1-E5-02's popular sort; CLAUDE.md rule 1).
-- What it proves:
-- - the hourly job scores each readable story from its reads, likes and comments (criterion 1);
--   a newer like counts more than an older one (time decay);
-- - the writer's own like and private downvotes never change a score (criterion 3);
-- - a changed weight is used by the next run, with no code change (criterion 2);
-- - browse_stories(): 'popular' orders by score with ties to the newer story; popular is the
--   default sort except on New and Recently updated; 'rising' holds new writers' stories only;
-- - get_story_page() gives the stats row its likes and comments;
-- - policy story_scores_select_staff: staff who may view stories read scores (allowed), a member
--   reads none (denied), and nobody writes the table directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A score read as the test's owner, whatever the policies say.
create function pg_temp.score_of(target_slug text) returns double precision
language sql security definer as $$
  select coalesce((select score from public.story_scores join public.stories on stories.id = story_scores.story_id
                   where stories.slug = target_slug), 0);
$$;
-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text[] language sql as $$
  select array(select story ->> 'slug' from jsonb_array_elements(answer -> 'stories') as story);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) two seed stories each get a chapter: seed01 came out 40 days ago, seed02
-- 30 days ago, so seed02 is the newer one when scores tie.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rank0001', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '40 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'rank0002', 1,
   'One', 'x', 3, 'published', 'One', 'The first chapter here.', 3, now() - interval '30 days');
update public.stories set first_published_at = now() - interval '40 days', last_chapter_published_at = now() - interval '40 days'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '30 days', last_chapter_published_at = now() - interval '30 days'
where id = '00000000-0000-4000-9000-000000000002';

-- The seed's follow of seed01 (teen_17) would count since S1-E15-05; these tests start from none.
delete from public.follows_stories where story_id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. The job and its signals ---------- */

select ok(public.compute_story_scores() >= 2, 'the job scores the readable stories (criterion 1)');
select is(pg_temp.score_of('statia-meteo-seed01'), pg_temp.score_of('the-girl-who-fixed-radios-seed02'),
  'with nothing read or liked, both score the same');
select is(pg_temp.slugs(public.browse_stories('popular')),
  array['the-girl-who-fixed-radios-seed02', 'statia-meteo-seed01'],
  'and the tie goes to the newer story (S1-E5-02, third criterion)');

-- teacher (…07) and blocker (…15) like seed01 today; pending_check (…05) comments on it.
insert into public.chapter_likes (user_id, chapter_id)
select persona, (select id from public.chapters where code = 'rank0001')
from unnest(array['00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015']::uuid[]) as persona;
insert into public.comments (user_id, chapter_id, body)
values ('00000000-0000-4000-8000-000000000005', (select id from public.chapters where code = 'rank0001'), 'Frumos!');
select public.compute_story_scores();
select ok(pg_temp.score_of('statia-meteo-seed01') > pg_temp.score_of('the-girl-who-fixed-radios-seed02'),
  'likes and a comment lift a story''s score');
select is(pg_temp.slugs(public.browse_stories('popular')),
  array['statia-meteo-seed01', 'the-girl-who-fixed-radios-seed02'], 'and Popular puts it first');

-- seed02 gets the same two likes, but 20 days ago: they count for less.
insert into public.chapter_likes (user_id, chapter_id, created_at)
select persona, (select id from public.chapters where code = 'rank0002'), now() - interval '20 days'
from unnest(array['00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015']::uuid[]) as persona;
create temporary table before_old_likes on commit drop as
select pg_temp.score_of('the-girl-who-fixed-radios-seed02') as score;
select public.compute_story_scores();
select ok(pg_temp.score_of('the-girl-who-fixed-radios-seed02') > (select score from before_old_likes)
  and pg_temp.score_of('the-girl-who-fixed-radios-seed02') < pg_temp.score_of('statia-meteo-seed01'),
  'older likes still count, but less than new ones (time decay)');

/* ---------- 2. What never counts ---------- */

create temporary table scores_before on commit drop as
select pg_temp.score_of('statia-meteo-seed01') as score;
insert into public.chapter_likes (user_id, chapter_id)
values ('00000000-0000-4000-8000-000000000001', (select id from public.chapters where code = 'rank0001'));
select public.compute_story_scores();
select is(pg_temp.score_of('statia-meteo-seed01'), (select score from scores_before),
  'the writer''s own like doesn''t change the score');
insert into public.comment_downvotes (user_id, comment_id, is_counted)
select persona, (select id from public.comments where body = 'Frumos!'), true
from unnest(array['00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015']::uuid[]) as persona;
select public.compute_story_scores();
select is(pg_temp.score_of('statia-meteo-seed01'), (select score from scores_before),
  'private downvotes are never used (criterion 3)');

/* ---------- 3. The weights ---------- */

update public.settings set value = '0'::jsonb where key in ('ranking_weight_likes', 'ranking_weight_comments');
select public.compute_story_scores();
select is(pg_temp.score_of('statia-meteo-seed01'), 0::double precision,
  'with the like and comment weights at 0 the next run scores it 0 (criterion 2)');
update public.settings set value = '5'::jsonb where key = 'ranking_weight_likes';
update public.settings set value = '8'::jsonb where key = 'ranking_weight_comments';
select public.compute_story_scores();

/* ---------- 4. The lists ---------- */

select is(pg_temp.slugs(public.browse_stories('category', 'fiction')),
  pg_temp.slugs(public.browse_stories('category', 'fiction', sort_order => 'popular')),
  'a category list is in popular order unless the reader picks another (S1-E5-02, first criterion)');
select is(pg_temp.slugs(public.browse_stories('new')),
  array['the-girl-who-fixed-radios-seed02', 'statia-meteo-seed01'], 'New keeps its newest-first order');
select throws_ok($$ select public.browse_stories('popular', sort_order => 'loudest') $$, '22023', null,
  'an unknown sort is refused');
select is(pg_temp.slugs(public.browse_stories('rising')),
  array['statia-meteo-seed01', 'the-girl-who-fixed-radios-seed02'],
  'New and rising holds a writer whose first story is recent');
update public.settings set value = '10'::jsonb where key = 'rising_writer_days';
select is(jsonb_array_length(public.browse_stories('rising') -> 'stories'), 0,
  'and lets them go once the first story is older than rising_writer_days');

/* ---------- 5. The story page and the policy ---------- */

select is(public.get_story_page('statia-meteo-seed01') -> 'stats',
  jsonb_build_object('likes', 3, 'comments', 1), 'the story page''s stats row gets its likes and comments');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.story_scores) >= 2,
  'allowed: story_scores_select_staff, an admin reads the scores');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.story_scores), 0,
  'denied: story_scores_select_staff, a member reads none (only the order)');
select throws_ok($$ insert into public.story_scores (story_id, score) values ('00000000-0000-4000-9000-000000000001', 99) $$,
  '42501', null, 'and nobody writes the table directly');

select * from finish();
rollback;
