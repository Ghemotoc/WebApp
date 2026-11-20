-- Database tests for the bookshelf limits on the free plan (CALM-4; Robert, 20 Nov 2026).
-- What it proves:
-- - the limits are 3 bookshelves of 10 books, and anyone may read them, signed out too, because
--   the Library and the "Add to a bookshelf" sheet write them in words;
-- - allowed: a member makes a third bookshelf and puts a tenth book on one;
-- - denied: a fourth bookshelf and an eleventh book are refused, with the hints the sheet reads;
-- - a member who already has more than the limits keeps every bookshelf and every book, and the
--   sheet counts every book they hold;
-- - a bookshelf draws its latest covers up to the 10 places it has.
-- Test data: eleven stories by adult_writer; bookshelves by teacher and support; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement's error carries, or null when it runs.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
-- IDs the test keeps between sign-ins.
create temporary table kept (label text primary key, list_id uuid);
grant all on kept to anon, authenticated;

-- Eleven live stories by adult_writer (bl01 to bl11), one chapter each.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  completion_status, first_published_at, last_chapter_published_at)
select ('00000000-0000-4000-9389-0000000000' || lpad(number::text, 2, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001', 'bl' || lpad(number::text, 2, '0'), 'Raft ' || number, 'ro',
  (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now()
from generate_series(1, 11) as number;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'bl' || right(stories.slug, 2) || 'ch01', 1, 'C', 'Text.', 1,
  'published', 'C1', 'Text.', 1, now()
from public.stories
where stories.id::text like '00000000-0000-4000-9389-%';

/* ---------- 1. The limits themselves ---------- */

select pg_temp.sign_out();
select is((select value::text from public.settings where key = 'reading_lists_max'), '3',
  'a signed-out visitor reads the limit of 3 bookshelves');
select is((select value::text from public.settings where key = 'reading_list_stories_max'), '10',
  'and the limit of 10 books on each');

/* ---------- 2. Up to the limits, and no further ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'first', (public.create_reading_list('First') ->> 'id')::uuid;
insert into kept select 'second', (public.create_reading_list('Second') ->> 'id')::uuid;
select is(pg_temp.hint_of($$ select public.create_reading_list('Third') $$), null,
  'allowed: a third bookshelf');
select is(pg_temp.hint_of($$ select public.create_reading_list('Fourth') $$), 'too_many_lists',
  'denied: a fourth bookshelf');

select is(
  (select count(*)::integer from generate_series(1, 10) as number
   where public.set_story_in_reading_list((select list_id from kept where label = 'first'),
     'bl' || lpad(number::text, 2, '0'), true) ->> 'outcome' = 'ok'),
  10, 'allowed: ten books on one bookshelf');
select is(pg_temp.hint_of($$ select public.set_story_in_reading_list((select list_id from kept where label = 'first'), 'bl11', true) $$),
  'too_many_stories', 'denied: an eleventh book');
select is((select (entry ->> 'book_count')::integer
           from jsonb_array_elements(public.story_reading_lists('bl01')) as entry
           where entry ->> 'name' = 'First'),
  10, 'the sheet says the full bookshelf holds 10 books');
select is(jsonb_array_length((select entry -> 'covers' from jsonb_array_elements(public.my_reading_lists()) as entry
                              where entry ->> 'name' = 'First')),
  10, 'a full bookshelf draws all ten covers');

/* ---------- 3. Over the limits from before CALM-4: nothing is taken away ---------- */

-- support made four bookshelves, one of eleven books, while the limits were 30 and 200.
select pg_temp.as_postgres();
insert into public.reading_lists (id, user_id, name)
select ('00000000-0000-4000-9389-1000000000' || lpad(number::text, 2, '0'))::uuid,
  '00000000-0000-4000-8000-000000000011', 'Old ' || number
from generate_series(1, 4) as number;
insert into public.reading_list_stories (list_id, story_id, user_id)
select '00000000-0000-4000-9389-100000000001', stories.id, '00000000-0000-4000-8000-000000000011'
from public.stories where stories.id::text like '00000000-0000-4000-9389-0000%';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(jsonb_array_length(public.my_reading_lists()), 4,
  'a member over the limit keeps all four bookshelves');
select is((select (entry ->> 'story_count')::integer from jsonb_array_elements(public.my_reading_lists()) as entry
           where entry ->> 'name' = 'Old 1'),
  11, 'and all eleven books');
select is(jsonb_array_length((select entry -> 'covers' from jsonb_array_elements(public.my_reading_lists()) as entry
                              where entry ->> 'name' = 'Old 1')),
  10, 'the bookshelf draws its ten latest covers');
select is(pg_temp.hint_of($$ select public.create_reading_list('Fifth') $$), 'too_many_lists',
  'but makes no new bookshelf while over the limit');

select * from finish();
rollback;
