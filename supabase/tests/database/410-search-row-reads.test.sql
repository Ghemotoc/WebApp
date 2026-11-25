-- Database tests for the reads on each search result row (user story 1.8, board
-- A08-SearchResults: "pen name · reads · chapters · when it last changed").
-- What it proves:
-- - a search's cards carry the story's public reads total, the one its story page shows;
-- - other lists' cards don't carry it, so they don't pay for it;
-- - the helper isn't callable from the app.
-- Seed: seed01 "Stația meteo" by adult_writer (…01). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

-- seed01 gets one published chapter with 7 reads over two days.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rds00010',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, current_date - day_back, 3 + day_back
from public.chapters, generate_series(0, 1) as day_back
where chapters.code = 'rds00010';

-- What the story page shows, read before signing out (the helper is internal).
select set_config('test.page_reads', public.story_read_total('00000000-0000-4000-9000-000000000001')::text, true);
select set_config('role', 'anon', true);

-- The card of seed01 in a list, by its address.
create function pg_temp.card(answer jsonb) returns jsonb language sql as $$
  select story from jsonb_array_elements(answer -> 'stories') as listed(story)
  where story ->> 'slug' = 'statia-meteo-seed01';
$$;
grant execute on all functions in schema pg_temp to anon;

select is((pg_temp.card(public.browse_stories('search', 'statia meteo')) ->> 'reads')::integer, 7,
  'a search row carries the story''s reads');
select is((pg_temp.card(public.browse_stories('search', 'statia meteo')) ->> 'reads')::integer,
  current_setting('test.page_reads')::integer,
  'the same total the story page shows');
select ok(not (pg_temp.card(public.browse_stories('updated', page_size => 60)) ? 'reads'),
  'another list''s card has no reads');
select throws_ok($$ select public.story_list_row_extras('search', '00000000-0000-4000-9000-000000000001') $$,
  '42501', null, 'the helper isn''t callable from the app');

select * from finish();
rollback;
