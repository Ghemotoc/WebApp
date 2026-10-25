-- Epic check for S1-E5, discovery and profiles (story S1-E5-QA, part one: the home page journey
-- waits for S1-E5-08 in CMS-1).
-- It adds no feature: it walks the epic's main journeys through the database, where the lists
-- (S1-E5-01, S1-E5-09), the sorts (S1-E5-02), the ranking (S1-E5-03) and profiles and blocks
-- (S1-E5-05) meet the stories that feed them, with the seed personas the story names.
-- Reads and likes (S1-E4-01a × S1-E6-03 × S1-E5-03): readers open and like the second seed story,
--   and the next scoring run puts it first on Popular and on its category page.
-- Ratings (S1-E3-06 × S1-E5-01 × S1-E5-03): at 16+, kid_14_ok and kid_14_waiting don't get it on
--   Popular, a category, a tag or the writer's list; teen_17 does.
-- Blocks (S1-E5-05 × S1-E5-03): blocker blocks adult_writer, and neither of the writer's stories
--   is on blocker's lists or profile view.
-- Moderation (S1-E10-06 × S1-E5-03): a hidden story leaves Popular however high it scored.
-- Follows (S1-E6-05 × S1-E5-01): teacher's follows shelf keeps its own order, the last chapter.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text[] language sql as $$
  select array(select story ->> 'slug' from jsonb_array_elements(answer -> 'stories') as story);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's two seed stories, All ages fiction, each with a chapter; the radios story is
-- older, so without any activity it would come second.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epics501', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '5 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'epics502', 1,
   'One', 'x', 3, 'published', 'One', 'The first chapter here.', 3, now() - interval '20 days');
update public.stories set first_published_at = now() - interval '5 days', last_chapter_published_at = now() - interval '5 days'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '20 days', last_chapter_published_at = now() - interval '20 days'
where id = '00000000-0000-4000-9000-000000000002';

/* ---------- 1. Reads and likes lift a story ---------- */

select public.compute_story_scores();
select is(pg_temp.slugs(public.browse_stories('popular')),
  array['statia-meteo-seed01', 'the-girl-who-fixed-radios-seed02'],
  'with no activity, the newer story leads Popular');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.record_chapter_read('the-girl-who-fixed-radios-seed02', 'epics502');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.record_chapter_read('the-girl-who-fixed-radios-seed02', 'epics502');
select public.like_chapter('the-girl-who-fixed-radios-seed02', 'epics502', true);
reset role;
select public.compute_story_scores();
select is(pg_temp.slugs(public.browse_stories('popular')),
  array['the-girl-who-fixed-radios-seed02', 'statia-meteo-seed01'],
  'reads and a like from the reader put the older story first (S1-E4-01a × S1-E6-03 × S1-E5-03)');
select is(pg_temp.slugs(public.browse_stories('category', 'fiction')),
  pg_temp.slugs(public.browse_stories('popular')),
  'and its category page opens in the same popular order (S1-E5-02)');
select is(public.get_story_page('the-girl-who-fixed-radios-seed02') #>> '{stats,likes}', '1',
  'and its story page counts the like');

/* ---------- 2. Ratings across every list ---------- */

update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(not ('the-girl-who-fixed-radios-seed02' = any(pg_temp.slugs(public.browse_stories('popular')))),
  'at 16+, kid_14_ok doesn''t get it on Popular (S1-E3-06 × S1-E5-03)');
select ok(not ('the-girl-who-fixed-radios-seed02' = any(
    pg_temp.slugs(public.browse_stories('category', 'fiction'))
    || pg_temp.slugs(public.browse_stories('writer', 'adult_writer'))
    || pg_temp.slugs(public.browse_stories('rising')))),
  'nor on the category, the writer''s list or New and rising');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select ok(not ('the-girl-who-fixed-radios-seed02' = any(pg_temp.slugs(public.browse_stories('popular')))),
  'nor does kid_14_waiting');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok('the-girl-who-fixed-radios-seed02' = any(pg_temp.slugs(public.browse_stories('popular'))),
  'teen_17 does');

/* ---------- 3. Blocks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.set_block('adult_writer', true);
select is(jsonb_array_length(public.browse_stories('popular') -> 'stories')
        + jsonb_array_length(public.browse_stories('rising') -> 'stories'), 0,
  'after blocking adult_writer, blocker gets none of the writer''s stories on Popular or New and rising');
select is(jsonb_array_length(public.browse_stories('writer', 'adult_writer') -> 'stories'), 0,
  'nor on the writer''s own list (S1-E5-05 × S1-E5-09)');
select public.set_block('adult_writer', false);
select ok('statia-meteo-seed01' = any(pg_temp.slugs(public.browse_stories('popular'))),
  'and gets them back after unblocking');

/* ---------- 4. Moderation and follows ---------- */

reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'story', '00000000-0000-4000-9000-000000000001', 'hidden',
  '00000000-0000-4000-8000-000000000010', 'Epic check.');
select public.compute_story_scores();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(not ('statia-meteo-seed01' = any(pg_temp.slugs(public.browse_stories('popular')))),
  'a story staff hid leaves Popular (S1-E10-06 × S1-E5-03)');
reset role;
delete from public.moderated_items where item_id = '00000000-0000-4000-9000-000000000001';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.follow_writer('adult_writer', true);
select is(pg_temp.slugs(public.browse_stories('following')),
  array['statia-meteo-seed01', 'the-girl-who-fixed-radios-seed02'],
  'teacher''s follows shelf keeps the last-chapter order, not popularity (S1-E6-05 × S1-E5-03)');
select ok(public.get_writer_profile('adult_writer')::text !~ '00000000-0000-4000-8000',
  'and the writer''s profile still names no user ID');

select * from finish();
rollback;
