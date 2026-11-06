-- Database tests for Discover's cards and five shelves (story S1-E5-12, bundle LOOK-4b; Robert,
-- 6 Nov 2026, D5).
-- What it proves:
-- - discover_shelves is the board's five, in order;
-- - a reader's latest unfinished story comes back with "chapter n of N", and "Chapter n is out"
--   only when a newer chapter really came out after they last read; once they read on, it goes;
-- - a story read to the end isn't offered to carry on;
-- - a story across a block isn't offered to carry on;
-- - the latest draft chapter comes back with its story and number; someone with none gets null;
-- - may_write follows the account gate; a visitor is refused.
-- Personas: adult_writer (…01, writes), teacher (…07, reads), blocker (…15, blocks …16).
-- Test data: one story with two chapters by adult_writer, one by blocked (…16); rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's story: chapter 1 out a week ago, chapter 2 out yesterday, chapter 3 a draft.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id,
  first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9305-00000000000a', '00000000-0000-4000-8000-000000000001', 'Cards A',
   'cards-a-qa305', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'),
   now() - interval '7 days', now() - interval '1 day'),
  ('00000000-0000-4000-9305-00000000000b', '00000000-0000-4000-8000-000000000016', 'Cards B',
   'cards-b-qa305', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'),
   now() - interval '7 days', now() - interval '7 days');
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9305-0000000000a1', '00000000-0000-4000-9305-00000000000a',
   '00000000-0000-4000-8000-000000000001', 'q305aaa1', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1,
   now() - interval '7 days'),
  ('00000000-0000-4000-9305-0000000000a2', '00000000-0000-4000-9305-00000000000a',
   '00000000-0000-4000-8000-000000000001', 'q305aaa2', 2, 'Doi', 'x', 1, 'published', 'Doi', 'Text.', 1,
   now() - interval '1 day'),
  ('00000000-0000-4000-9305-0000000000b1', '00000000-0000-4000-9305-00000000000b',
   '00000000-0000-4000-8000-000000000016', 'q305bbb1', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1,
   now() - interval '7 days');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('00000000-0000-4000-9305-00000000000a', '00000000-0000-4000-8000-000000000001', 'q305aaa3', 3,
  'Trei, schiță', 'x', 1240);
-- Nothing else of adult_writer's is a more recent draft.
update public.chapters set updated_at = now() - interval '30 days'
where user_id = '00000000-0000-4000-8000-000000000001' and status = 'draft' and code <> 'q305aaa3';

-- teacher read chapter 1 three days ago; blocker read blocked's story.
insert into public.library_entries (user_id, story_id, shelf) values
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9305-00000000000a', 'reading'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9305-00000000000b', 'reading')
on conflict (user_id, story_id) do update set shelf = 'reading';
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind, updated_at) values
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9305-00000000000a',
   '00000000-0000-4000-9305-0000000000a1', 80, 'computer', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9305-00000000000b',
   '00000000-0000-4000-9305-0000000000b1', 40, 'computer', now() - interval '3 days');
-- Older places elsewhere don't count for this test.
delete from public.reading_positions
where user_id in ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015')
  and story_id not in ('00000000-0000-4000-9305-00000000000a', '00000000-0000-4000-9305-00000000000b');

/* ---------- 1. The five shelves ---------- */

select is((select value from public.settings where key = 'discover_shelves'),
  '["following", "popular", "rising", "classics", "writers"]'::jsonb,
  'Discover has the board''s five shelves, in order');

/* ---------- 2. Continue reading ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_discover_cards() #>> '{continue_reading,story,slug}', 'cards-a-qa305',
  'the reader''s latest unfinished story comes back');
select is(public.my_discover_cards() #>> '{continue_reading,place,number}', '1',
  'with the chapter they are on');
select is(public.my_discover_cards() #>> '{continue_reading,place,total}', '2', 'and how many there are');
select is(public.my_discover_cards() #>> '{continue_reading,new_chapter_number}', '2',
  '"Chapter 2 is out": it came out after they last read');
select pg_temp.as_postgres();
update public.reading_positions set updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000007' and story_id = '00000000-0000-4000-9305-00000000000a';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_discover_cards() #> '{continue_reading,new_chapter_number}', 'null'::jsonb,
  'once they read after it came out, no "is out" line');
select pg_temp.as_postgres();
update public.reading_positions set chapter_id = '00000000-0000-4000-9305-0000000000a2', percent = 100
where user_id = '00000000-0000-4000-8000-000000000007' and story_id = '00000000-0000-4000-9305-00000000000a';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_discover_cards() -> 'continue_reading', 'null'::jsonb,
  'a story read to the end of its last chapter isn''t offered to carry on');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.my_discover_cards() -> 'continue_reading', 'null'::jsonb,
  'a story across a block isn''t offered to carry on');

/* ---------- 3. The draft ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_discover_cards() #>> '{draft,chapter_code}', 'q305aaa3', 'the latest draft chapter comes back');
select is(public.my_discover_cards() #>> '{draft,story_title}', 'Cards A', 'with its story');
select is(public.my_discover_cards() #>> '{draft,number}', '3', 'and its number');
select is(public.my_discover_cards() #>> '{draft,word_count}', '1240', 'and its words');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_discover_cards() -> 'draft', 'null'::jsonb, 'someone with no draft gets none');

/* ---------- 4. Who may write, and who may ask ---------- */

select is(public.my_discover_cards() ->> 'may_write', 'true', 'an active member may write');
select pg_temp.sign_out();
select throws_ok($$ select public.my_discover_cards() $$, '42501', null, 'a visitor is refused');

select * from finish();
rollback;
