-- QA-3: the ranking job's exact scores (independent QA check, 5 Nov 2026, finding A2).
--
-- Why: removing the comments weight, the read-through multiplier or the clean-up of unreadable
-- stories from compute_story_scores() left every other database test passing. This test fixes
-- every signal at a known number, all of it from today so time decay is exactly 1, and checks
-- the score to the decimal, so each of those changes now fails it.
-- What it proves (S1-E5-03; share points S1-E4-05):
-- - score = (reads × 1 + likes × 5 + comments × 8 + shares × 10) × (1 + read-through × 0.5);
-- - read-through is the last chapter's reads over the first chapter's (0 for a one-chapter story);
-- - the order on Popular follows those exact scores;
-- - a story with no readable chapter left drops out of the scores.
-- Personas: adult_writer (…01) writes; pending_check (…05), teacher (…07) and blocker (…15)
-- like and comment. Test data is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- A score read as the test's owner, whatever the policies say; null when there is none.
create function pg_temp.score_of(target_slug text) returns numeric language sql as $$
  select round(score::numeric, 4) from public.story_scores
  join public.stories on stories.id = story_scores.story_id where stories.slug = target_slug;
$$;
-- A chapter's id by its code.
create function pg_temp.chapter(target_code text) returns uuid language sql as $$
  select id from public.chapters where code = target_code;
$$;

/* ---------- Test data, written as postgres ---------- */

-- The weights as the settings ship them, set here so a later change of defaults can't move them.
update public.settings set value = '1'::jsonb where key = 'ranking_weight_reads';
update public.settings set value = '5'::jsonb where key = 'ranking_weight_likes';
update public.settings set value = '8'::jsonb where key = 'ranking_weight_comments';
update public.settings set value = '10'::jsonb where key = 'ranking_weight_shares';
update public.settings set value = '0.5'::jsonb where key = 'ranking_weight_read_through';

-- Three stories: A with one chapter, B with two, C with one that will stop being readable.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id, first_published_at)
values
  ('00000000-0000-4000-9296-00000000000a', '00000000-0000-4000-8000-000000000001', 'Rang A',
   'rang-a-qa296', 'all_ages', 'ro', (select id from public.categories limit 1), now() - interval '3 days'),
  ('00000000-0000-4000-9296-00000000000b', '00000000-0000-4000-8000-000000000001', 'Rang B',
   'rang-b-qa296', 'all_ages', 'ro', (select id from public.categories limit 1), now() - interval '2 days'),
  ('00000000-0000-4000-9296-00000000000c', '00000000-0000-4000-8000-000000000001', 'Rang C',
   'rang-c-qa296', 'all_ages', 'ro', (select id from public.categories limit 1), now() - interval '1 day');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9296-00000000000a', '00000000-0000-4000-8000-000000000001', 'q296aaa1', 1,
   'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '3 days'),
  ('00000000-0000-4000-9296-00000000000b', '00000000-0000-4000-8000-000000000001', 'q296bbb1', 1,
   'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '2 days'),
  ('00000000-0000-4000-9296-00000000000b', '00000000-0000-4000-8000-000000000001', 'q296bbb2', 2,
   'Doi', 'x', 1, 'published', 'Doi', 'Text.', 1, now() - interval '2 days'),
  ('00000000-0000-4000-9296-00000000000c', '00000000-0000-4000-8000-000000000001', 'q296ccc1', 1,
   'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '1 day');

-- Today's reads (Romanian time, as the job counts them): A 10; B 20 on chapter 1, 10 on chapter 2.
insert into public.chapter_reads (chapter_id, read_on, total)
values (pg_temp.chapter('q296aaa1'), (now() at time zone 'Europe/Bucharest')::date, 10),
       (pg_temp.chapter('q296bbb1'), (now() at time zone 'Europe/Bucharest')::date, 20),
       (pg_temp.chapter('q296bbb2'), (now() at time zone 'Europe/Bucharest')::date, 10);
-- A: two readers' likes, one comment and one share, all today.
insert into public.chapter_likes (user_id, chapter_id)
values ('00000000-0000-4000-8000-000000000007', pg_temp.chapter('q296aaa1')),
       ('00000000-0000-4000-8000-000000000015', pg_temp.chapter('q296aaa1'));
insert into public.comments (user_id, chapter_id, body)
values ('00000000-0000-4000-8000-000000000005', pg_temp.chapter('q296aaa1'), 'Ce frumos!');
insert into public.chapter_shares (chapter_id, shared_on, total)
values (pg_temp.chapter('q296aaa1'), (now() at time zone 'Europe/Bucharest')::date, 1);

select public.compute_story_scores();

/* ---------- 1. The exact scores ---------- */

-- A: (10 × 1 + 2 × 5 + 1 × 8 + 1 × 10) × (1 + 0 × 0.5) = 38.
select is(pg_temp.score_of('rang-a-qa296'), 38.0000,
  'A scores reads + 5 per like + 8 per comment + 10 per share, with no read-through for one chapter');
-- B: 30 reads × (1 + (10 / 20) × 0.5) = 37.5.
select is(pg_temp.score_of('rang-b-qa296'), 37.5000,
  'B''s 30 reads are lifted by half its read-through (the last chapter read half as often as the first)');
select is(pg_temp.score_of('rang-c-qa296'), 0.0000, 'C, with nothing read, scores 0');
select ok((select array_position(array(select story ->> 'slug'
    from jsonb_array_elements(public.browse_stories('popular', page_size => 60) -> 'stories') as story), 'rang-a-qa296'))
  < (select array_position(array(select story ->> 'slug'
    from jsonb_array_elements(public.browse_stories('popular', page_size => 60) -> 'stories') as story), 'rang-b-qa296')),
  'Popular puts A (38) before B (37.5)');

/* ---------- 2. A changed weight is used exactly ---------- */

update public.settings set value = '1'::jsonb where key = 'ranking_weight_read_through';
select public.compute_story_scores();
select is(pg_temp.score_of('rang-b-qa296'), 45.0000,
  'with the read-through weight at 1, B scores 30 × (1 + 0.5) = 45');

/* ---------- 3. An unreadable story drops out ---------- */

update public.chapters set deleted_at = now() where code = 'q296ccc1';
select public.compute_story_scores();
select is(pg_temp.score_of('rang-c-qa296'), null, 'C, with no readable chapter left, has no score at all');
select is(pg_temp.score_of('rang-a-qa296'), 38.0000, 'and the others keep theirs');

select * from finish();
rollback;
