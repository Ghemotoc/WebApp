-- Database tests for the Search page's Trending tags (user story 1.7, board A07-Search).
-- What it proves:
-- - the tags whose stories were read most in the last seven days come first;
-- - reads older than a week don't count, and a tag waiting for approval never shows;
-- - a tag carried only by a story above the reader's age never trends for them (CLAUDE.md
--   rule 18), and a visitor reads the list too.
-- Personas: kid_14_ok (…03). Seed stories: seed01 (All ages) and seed02 (made 16+ here), both
-- by adult_writer (…01). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- One published chapter each; seed02 becomes 16+.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'trd00010', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'trd00020', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now());
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';

-- Four tags: two approved on seed01, one approved only on the 16+ seed02, one waiting.
insert into public.tags (name, normalised_name, status) values
  ('trendzq-ghosts', 'trendzq-ghosts', 'approved'),
  ('trendzq-folklore', 'trendzq-folklore', 'approved'),
  ('trendzq-mature', 'trendzq-mature', 'approved'),
  ('trendzq-waiting', 'trendzq-waiting', 'waiting');
insert into public.story_tags (story_id, tag_id, user_id)
select '00000000-0000-4000-9000-000000000001', tags.id, '00000000-0000-4000-8000-000000000001'
from public.tags where tags.name in ('trendzq-ghosts', 'trendzq-folklore', 'trendzq-waiting');
insert into public.story_tags (story_id, tag_id, user_id)
select '00000000-0000-4000-9000-000000000002', tags.id, '00000000-0000-4000-8000-000000000001'
from public.tags where tags.name in ('trendzq-folklore', 'trendzq-mature');

-- seed02 (16+) is read 50 times this week, seed01 9 times this week and 500 times a month ago.
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, current_date, case chapters.code when 'trd00010' then 9 else 50 end
from public.chapters where chapters.code in ('trd00010', 'trd00020');
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, current_date - 30, 500 from public.chapters where chapters.code = 'trd00010';

-- Only this test's tags, in order.
create function pg_temp.trending() returns text language sql as $$
  select coalesce(string_agg(tag_name, ',' order by position), '')
  from jsonb_array_elements_text(public.trending_tags(20)) with ordinality as listed(tag_name, position)
  where tag_name like 'trendzq-%';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. An adult reader ---------- */

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is(pg_temp.trending(), 'trendzq-folklore,trendzq-mature,trendzq-ghosts',
  'the tags read most this week come first');
select ok(pg_temp.trending() !~ 'trendzq-waiting', 'a tag waiting for approval never shows');

/* ---------- 2. A 14-year-old and a visitor (rule 18) ---------- */

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is(pg_temp.trending(), 'trendzq-folklore,trendzq-ghosts',
  'a 14-year-old never sees a tag only a 16+ story carries, nor its reads');
select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
select is(pg_temp.trending(), 'trendzq-folklore,trendzq-ghosts', 'a visitor reads the list too');
select is(jsonb_array_length(public.trending_tags(1)), 1, 'how_many limits the list');

select * from finish();
rollback;
