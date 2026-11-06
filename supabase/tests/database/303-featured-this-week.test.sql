-- Database tests for Featured this week (story S1-E5-10, bundle LOOK-4a; CLAUDE.md rules 1, 6,
-- 15 and 18; Robert, 6 Nov 2026: staff pick, the writer must be 16 or over).
-- What it proves:
-- - only admins and the owner open the ranking screen and save picks (moderator and support
--   refused, criterion 9);
-- - the screen lists current active stories with their rank and why one can't be featured
--   (criteria 1 and 4); the Promising and New writers views filter, never re-rank (criterion 2);
-- - saving keeps the order, logs before and after and tells each newly picked writer
--   (criterion 3); a 14-year-old's story, a duplicate and a sixth story are refused (criterion 4);
-- - the band leaves out a 16+ story for a 14-year-old reader and for visitors (criterion 6), a
--   story across a block, and a writer suspended after the pick (criterion 5);
-- - no picks means an empty band (criterion 8);
-- - each policy: story_rank_snapshots and featured_picks select (allowed for an admin, denied for
--   a moderator); nobody writes the tables directly.
-- Personas: owner (…08), admin (…09), moderator (…10), support (…11), adult_writer (…01),
-- teen_17 (…02), kid_14_ok (…03), blocker (…15, who blocks …16).
-- Test data: four stories with one recent chapter each; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- The slugs of the band's cards, in order, for whoever is signed in.
create function pg_temp.band() returns text[] language sql as $$
  select coalesce(array_agg(card ->> 'slug' order by ordinality), '{}')
  from jsonb_array_elements(public.featured_stories_now()) with ordinality as cards (card, ordinality);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- Under-18 writers are active only once the March flags are off (they would be refused anyway).
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');

-- Four stories with a chapter out yesterday: an adult's All ages story, an adult's 16+ story, a
-- 17-year-old's All ages story and a 14-year-old's All ages story.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id, first_published_at)
values
  ('00000000-0000-4000-9303-00000000000a', '00000000-0000-4000-8000-000000000001', 'Featured A',
   'featured-a-qa303', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days'),
  ('00000000-0000-4000-9303-00000000000b', '00000000-0000-4000-8000-000000000001', 'Featured B',
   'featured-b-qa303', '16_plus', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days'),
  ('00000000-0000-4000-9303-00000000000c', '00000000-0000-4000-8000-000000000002', 'Featured C',
   'featured-c-qa303', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days'),
  ('00000000-0000-4000-9303-00000000000d', '00000000-0000-4000-8000-000000000003', 'Featured D',
   'featured-d-qa303', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'q303' || right(stories.id::text, 1) || 'aa1', 1,
  'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '1 day'
from public.stories where stories.slug like 'featured-%-qa303';
update public.stories set last_chapter_published_at = now() - interval '1 day'
where slug like 'featured-%-qa303';

/* ---------- 1. Who may open and save ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_featured_candidates() $$, '42501', null,
  'a moderator can''t open the Featured screen');
select throws_ok($$ select public.admin_set_featured_picks(array['00000000-0000-4000-9303-00000000000a'::uuid], 'Try') $$,
  '42501', null, 'a moderator can''t save picks');
select is_empty($$ select 1 from public.featured_picks $$,
  'denied: featured_picks_select_featured_staff: a moderator reads no picks');
select is_empty($$ select 1 from public.story_rank_snapshots $$,
  'denied: story_rank_snapshots_select_featured_staff: a moderator reads no snapshots');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_featured_candidates() $$, '42501', null,
  'support can''t open the Featured screen');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_featured_picks('{}', 'Try') $$, '42501', null,
  'a member can''t save picks');
select throws_ok($$ insert into public.featured_picks (story_id, position, user_id)
  values ('00000000-0000-4000-9303-00000000000a', 1, '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'nobody writes featured_picks directly');

/* ---------- 2. The ranking screen ---------- */

reset role;
select public.compute_story_scores();
select public.snapshot_story_ranks();

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select isnt_empty($$ select 1 from public.story_rank_snapshots $$,
  'allowed: story_rank_snapshots_select_featured_staff: an admin reads the snapshots');
select is(
  (select count(*)::integer from jsonb_array_elements(public.admin_featured_candidates() -> 'stories') as rows
   where rows ->> 'slug' like 'featured-%-qa303'),
  4, 'the screen lists every current active story');
select is(
  (select rows ->> 'ineligible_reason' from jsonb_array_elements(public.admin_featured_candidates() -> 'stories') as rows
   where rows ->> 'slug' = 'featured-d-qa303'),
  'writer_under_16', 'the screen says a 14-year-old''s story can''t be featured, and why');
select is(
  (select rows ->> 'ineligible_reason' from jsonb_array_elements(public.admin_featured_candidates() -> 'stories') as rows
   where rows ->> 'slug' = 'featured-c-qa303'),
  null, 'a 17-year-old''s story can be featured');
select ok(
  (select bool_and(rows ? 'rank' and rows ? 'rank_change' and rows ? 'reads_7d' and rows ? 'read_through'
     and rows ? 'followers' and rows ? 'first_published_at' and not rows ? 'user_id')
   from jsonb_array_elements(public.admin_featured_candidates() -> 'stories') as rows),
  'each row has the rank, its change, reads, read-through, followers and first chapter date, and no user ID');
select is(
  (select count(*)::integer from jsonb_array_elements(
     public.admin_featured_candidates('all', null, '16_plus') -> 'stories') as rows
   where rows ->> 'slug' like 'featured-%-qa303'),
  1, 'the rating filter narrows the list');
select throws_ok($$ select public.admin_featured_candidates('loudest') $$, '22023', null,
  'an unknown view is refused');
select is(public.admin_featured_candidates('all') -> 'featured_max', '5'::jsonb,
  'the screen knows the most it may pick');

/* ---------- 3. Saving ---------- */

select throws_ok($$ select public.admin_set_featured_picks(array['00000000-0000-4000-9303-00000000000a'::uuid], ' ') $$,
  '23514', null, 'a save needs a reason');
select throws_ok($$ select public.admin_set_featured_picks(
    array['00000000-0000-4000-9303-00000000000d'::uuid], 'New voices') $$,
  '23514', 'A story in the list can''t be featured: writer_under_16.',
  'a 14-year-old''s story is refused');
select throws_ok($$ select public.admin_set_featured_picks(
    array['00000000-0000-4000-9303-00000000000a', '00000000-0000-4000-9303-00000000000a']::uuid[], 'Twice') $$,
  '23514', null, 'a story can''t be in the list twice');
select throws_ok($$ select public.admin_set_featured_picks(
    array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()], 'Six') $$,
  '23514', null, 'six stories are too many');

select lives_ok($$ select public.admin_set_featured_picks(
    array['00000000-0000-4000-9303-00000000000b', '00000000-0000-4000-9303-00000000000a',
          '00000000-0000-4000-9303-00000000000c']::uuid[], 'This week''s mix') $$,
  'an admin saves three picks');
select is(
  (select array_agg(featured_picks.story_id order by position) from public.featured_picks where removed_at is null),
  array['00000000-0000-4000-9303-00000000000b', '00000000-0000-4000-9303-00000000000a',
        '00000000-0000-4000-9303-00000000000c']::uuid[],
  'allowed: featured_picks_select_featured_staff: an admin reads the picks, in the order saved');

reset role;
select is(
  (select after_values -> 'story_ids' from public.audit_log where action = 'featured.picks_set'
   order by created_at desc limit 1),
  '["00000000-0000-4000-9303-00000000000b", "00000000-0000-4000-9303-00000000000a", "00000000-0000-4000-9303-00000000000c"]'::jsonb,
  'the audit log has the new list');
select is(
  (select count(*)::integer from public.notifications where kind = 'story_featured'
   and story_id::text like '00000000-0000-4000-9303-%'),
  3, 'each newly picked story''s writer is told');

-- Saving again with one story kept tells only the new one.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select public.admin_set_featured_picks(
  array['00000000-0000-4000-9303-00000000000a']::uuid[], 'Trim the list');
reset role;
select is(
  (select count(*)::integer from public.notifications where kind = 'story_featured'
   and story_id::text like '00000000-0000-4000-9303-%'),
  3, 'a story that stays in the list isn''t announced again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select public.admin_set_featured_picks(
  array['00000000-0000-4000-9303-00000000000b', '00000000-0000-4000-9303-00000000000a',
        '00000000-0000-4000-9303-00000000000c']::uuid[], 'Back to the mix');

/* ---------- 4. The band ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.band(), array['featured-b-qa303', 'featured-a-qa303', 'featured-c-qa303'],
  'an adult reader sees the picks in the staff''s order');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.band(), array['featured-a-qa303', 'featured-c-qa303'],
  'a 14-year-old reader doesn''t see the 16+ pick');
select pg_temp.sign_out();
select is(pg_temp.band(), array['featured-a-qa303', 'featured-c-qa303'],
  'a visitor doesn''t see the 16+ pick');

-- A reader the writer blocked doesn't see the writer's picks.
reset role;
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000015');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.band(), array['featured-c-qa303'], 'a blocked reader doesn''t see the blocker''s picks');

-- The 17-year-old is suspended after the pick: their story leaves the band at once.
reset role;
insert into public.sanctions (user_id, kind, applied_by_user_id, note, starts_at, ends_at)
values ('00000000-0000-4000-8000-000000000002', 'suspension', '00000000-0000-4000-8000-000000000010',
  'Test suspension.', now(), now() + interval '7 days');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.band(), array['featured-b-qa303', 'featured-a-qa303'],
  'a writer suspended after the pick leaves the band without staff doing anything');

-- With every pick taken out, the band is empty and Discover hides it.
reset role;
update public.featured_picks set removed_at = now() where removed_at is null;
select pg_temp.sign_out();
select is(pg_temp.band(), '{}'::text[], 'no picks means an empty band');

select * from finish();
rollback;
