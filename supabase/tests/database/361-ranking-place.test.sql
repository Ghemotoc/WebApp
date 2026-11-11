-- Database tests for the ranking place, "#3 in Fantasy" (story S1-E15-05, bundle ANALYTICS-1b).
-- What it proves:
-- - follows and finished chapters add to the popularity score, a writer's own follow doesn't,
--   and growth against 7 days ago lifts it (criterion 1);
-- - story_rank_place() gives the place in the category to anyone who may see the story, staff
--   included, and nothing past place 100, for a story nobody can find or one the caller may not
--   see (criteria 2 and 3).
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- A visitor: no claims left from an earlier sign-in (they last until the transaction ends).
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

/* ---------- Set-up: three readable fiction stories with the same reads ---------- */

insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rank0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 2300, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'rank0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 2300, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'rank0003', 1, 'Trei', 'x', 1, 'published', 'Trei', 'Text.', 2300, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now(), rating = 'all_ages',
  visibility = 'public', category_id = (select id from public.categories where slug = 'fiction')
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, (now() at time zone 'Europe/Bucharest')::date, 10
from public.chapters where chapters.code in ('rank0001', 'rank0002', 'rank0003');

-- No follows or finishes yet, whatever the seed or an earlier run left (rolled back at the end).
delete from public.follows_stories where story_id in ('00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-9000-000000000003');
delete from public.chapter_finishes;
delete from public.story_rank_snapshots;
select public.compute_story_scores();
create temporary table base_scores on commit drop as
select story_id, score from public.story_scores
where story_id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');

/* ---------- 1. The extra signals ---------- */

-- seed01 gets a follow from teen_17 (…02) and its own writer's follow; seed02 two finished chapters.
insert into public.follows_stories (user_id, story_id) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001');
insert into public.chapter_finishes (chapter_id, read_on, total)
select chapters.id, (now() at time zone 'Europe/Bucharest')::date, 2
from public.chapters where chapters.code = 'rank0002';
select public.compute_story_scores();

select ok((select score from public.story_scores where story_id = '00000000-0000-4000-9000-000000000001')
        > (select score from base_scores where story_id = '00000000-0000-4000-9000-000000000001'),
  'a follow adds to the score');
select is((select follows from public.story_more_signals()
           where story_id = '00000000-0000-4000-9000-000000000001')::numeric(6, 2), 1.00,
  'and the writer''s own follow doesn''t count');
select ok((select score from public.story_scores where story_id = '00000000-0000-4000-9000-000000000002')
        > (select score from base_scores where story_id = '00000000-0000-4000-9000-000000000002'),
  'finished chapters add to the score');

-- seed03's score a week ago was half of today's, so it grew by 100%.
insert into public.story_rank_snapshots (story_id, snapshot_on, rank, score)
select story_id, (now() at time zone 'Europe/Bucharest')::date - 7, 3, score / 2
from public.story_scores where story_id = '00000000-0000-4000-9000-000000000003';
select is((select growth from public.story_more_signals()
           where story_id = '00000000-0000-4000-9000-000000000003')::numeric(6, 2), 1.00,
  'growth against 7 days ago is counted, up to doubling');
select public.compute_story_scores();
select ok((select score from public.story_scores where story_id = '00000000-0000-4000-9000-000000000003')
        > (select score from base_scores where story_id = '00000000-0000-4000-9000-000000000003'),
  'and growth lifts the score');

/* ---------- 2. The place ---------- */

-- Fix the order to be sure: seed02 first, seed01 second, seed03 third in fiction.
update public.story_scores set score = case story_id
  when '00000000-0000-4000-9000-000000000002' then 300
  when '00000000-0000-4000-9000-000000000001' then 200
  else 100 end
where story_id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');
delete from public.story_scores where story_id not in ('00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-9000-000000000003');

select pg_temp.sign_out();
select is(public.story_rank_place('statia-meteo-seed01'),
  '{"place": 2, "category_slug": "fiction"}'::jsonb, 'a visitor sees "#2 in Fiction"');
reset role;

-- An 18+ story hides its place from a visitor, but not from staff.
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000003';
select pg_temp.sign_out();
select is(public.story_rank_place('scrisori-din-cutia-postala-seed03'), null,
  'a visitor gets no place for a story their age doesn''t allow');
reset role;
set local role authenticated;
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000009');
select is((public.story_rank_place('scrisori-din-cutia-postala-seed03') ->> 'place')::integer, 3,
  'staff who may view stories see it');
reset role;

-- An unlisted story isn't ranked among the stories readers can find.
update public.stories set visibility = 'unlisted' where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.sign_out();
select is((public.story_rank_place('statia-meteo-seed01') ->> 'place')::integer, 1,
  'an unlisted story leaves the places, so seed01 moves up');
select is(public.story_rank_place('the-girl-who-fixed-radios-seed02'), null,
  'and the unlisted story itself gets none');
reset role;

-- Past the setting, no place.
update public.settings set value = '1'::jsonb where key = 'ranking_place_show_up_to';
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000003';
select pg_temp.sign_out();
select is(public.story_rank_place('scrisori-din-cutia-postala-seed03'), null,
  'a story past the last place shown gets none');
reset role;

select * from finish();
rollback;
