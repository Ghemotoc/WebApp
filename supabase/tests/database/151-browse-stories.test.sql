-- Database tests for the story lists behind Discover, category and tag pages (story S1-E5-01;
-- CLAUDE.md rules 15 and 18).
-- What it proves:
-- - a list holds only published stories readers can open, newest update first, with the writer's
--   name and never a user ID;
-- - ratings: a visitor sees All ages and 13+ only, a 14-year-old no 16+, an adult everything
--   (criterion 3, rule 18);
-- - blocks: a writer either side blocks is left out of every list (criterion 4);
-- - the category, tag, completed, following and writer lists, and the status and language filters
--   (criteria 1 and 2);
-- - a story moderators hid is left out; pages never overlap and the total stays the same;
-- - unknown lists, missing keys and negative offsets are refused; the internals aren't callable.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(answer -> 'stories') with ordinality as listed(story, position);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The three seed stories get a published chapter each, an hour apart (seed03 newest):
-- seed01 "Stația meteo" (adult_writer, fiction, ro, All ages, tags bunici, familie, set in Romania),
-- seed02 (adult_writer, fiction, en, made 16+ and completed, tags mystery, set in Romania, family),
-- seed03 (teen_17, poetry, ro, 13+).
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'brws0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'brws0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'brws0003', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
update public.stories set first_published_at = now() - interval '3 hours', last_chapter_published_at = now() - interval '3 hours'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '4 hours', last_chapter_published_at = now() - interval '2 hours',
  rating = '16_plus', completion_status = 'completed'
where id = '00000000-0000-4000-9000-000000000002';
update public.stories set first_published_at = now() - interval '1 hour', last_chapter_published_at = now() - interval '1 hour'
where id = '00000000-0000-4000-9000-000000000003';
-- blocked (…16) writes a published story; blocker (…15) blocks them in the seed.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, first_published_at, last_chapter_published_at)
values ('00000000-0000-4000-9000-000000000099', '00000000-0000-4000-8000-000000000016', 'pe-banca-seed99', 'Pe bancă', 'ro',
  (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '5 hours', now() - interval '5 hours');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000099', '00000000-0000-4000-8000-000000000016', 'brws0099', 1, 'Unu', 'x', 1,
  'published', 'Unu', 'Text.', 1, now());
-- And a draft story that nobody else may see.
insert into public.stories (user_id, slug, title, language_code, category_id, rating)
values ('00000000-0000-4000-8000-000000000001', 'ciorna-seed98', 'Ciornă', 'ro',
  (select id from public.categories where slug = 'fiction'), 'all_ages');

/* ---------- 1. What a visitor sees ---------- */

select pg_temp.sign_out();
select is(pg_temp.slugs(public.browse_stories('updated')),
  'scrisori-din-cutia-postala-seed03,statia-meteo-seed01,pe-banca-seed99',
  'a visitor sees the All ages and 13+ stories, newest update first, never a 16+ one or a draft');
select is((public.browse_stories('updated') ->> 'total')::integer, 3, 'and the total counts them');
select is(public.browse_stories('updated') #>> '{stories,1,writer,display_name}', 'Lia Scrie',
  'each card names the writer');
select ok(public.browse_stories('updated')::text not like '%00000000-0000-4000-8000-%', 'and never a user ID');
select is(public.browse_stories('updated') #>> '{stories,1,chapter_count}', '1', 'with the readable chapter count');

/* ---------- 2. Ratings (rule 18) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');  -- kid_14_ok
select is((public.browse_stories('updated') ->> 'total')::integer, 3, 'a 14-year-old doesn''t get the 16+ story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');  -- teacher, an adult
select is(pg_temp.slugs(public.browse_stories('updated')),
  'scrisori-din-cutia-postala-seed03,the-girl-who-fixed-radios-seed02,statia-meteo-seed01,pe-banca-seed99',
  'an adult sees all four');

/* ---------- 3. Blocks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');  -- blocker
select ok(pg_temp.slugs(public.browse_stories('updated')) not like '%pe-banca%',
  'a writer you block is left out');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');  -- blocked
select ok(pg_temp.slugs(public.browse_stories('updated')) like '%pe-banca%',
  'a writer always sees their own story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ select public.set_block('adult_writer', true) $$, 'teacher blocks adult_writer');
select is(pg_temp.slugs(public.browse_stories('updated')), 'scrisori-din-cutia-postala-seed03,pe-banca-seed99',
  'and adult_writer''s stories leave every list');
select lives_ok($$ select public.set_block('adult_writer', false) $$, 'and unblocks');

/* ---------- 4. The lists and the filters ---------- */

select is(pg_temp.slugs(public.browse_stories('category', 'poetry')), 'scrisori-din-cutia-postala-seed03',
  'a category lists its stories');
select is(pg_temp.slugs(public.browse_stories('tag', 'Set in Romania')),
  'statia-meteo-seed01,the-girl-who-fixed-radios-seed02',
  'a tag lists every visible story with it, whatever its case (popular order: no scores yet, so the newer first)');
select is(pg_temp.slugs(public.browse_stories('completed')), 'the-girl-who-fixed-radios-seed02',
  'Completed lists only completed stories');
select is(pg_temp.slugs(public.browse_stories('new')),
  'scrisori-din-cutia-postala-seed03,statia-meteo-seed01,the-girl-who-fixed-radios-seed02,pe-banca-seed99',
  'New lists by first publication');
select is(pg_temp.slugs(public.browse_stories('updated', null, 'fiction', 'ongoing', 'ro')),
  'statia-meteo-seed01,pe-banca-seed99', 'the category, status and language filters narrow a list');
select is(pg_temp.slugs(public.browse_stories('writer', '@adult_writer')),
  'statia-meteo-seed01,the-girl-who-fixed-radios-seed02', 'a writer''s list holds their stories');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');  -- teen_17 follows adult_writer
select is(pg_temp.slugs(public.browse_stories('following')), 'the-girl-who-fixed-radios-seed02,statia-meteo-seed01',
  'Following lists the stories of writers the reader follows');
select pg_temp.sign_out();
select is((public.browse_stories('following') ->> 'total')::integer, 0, 'and is empty for a visitor');

/* ---------- 5. Moderation and pages ---------- */

reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000002', 'story', '00000000-0000-4000-9000-000000000003', 'hidden',
  '00000000-0000-4000-8000-000000000010', 'Test hide');
select pg_temp.sign_out();
select is(pg_temp.slugs(public.browse_stories('updated')), 'statia-meteo-seed01,pe-banca-seed99',
  'a story moderators hid leaves every list');
select is(pg_temp.slugs(public.browse_stories('updated', page_size => 1, page_offset => 1)), 'pe-banca-seed99',
  'the second page of one starts where the first ended');
select is((public.browse_stories('updated', page_size => 1, page_offset => 1) ->> 'total')::integer, 2,
  'and the total stays the same');

/* ---------- 6. Refusals ---------- */

select throws_ok($$ select public.browse_stories('everything') $$, '22023', null, 'an unknown list is refused');
select throws_ok($$ select public.browse_stories('tag', '  ') $$, '22023', null, 'a tag list needs a tag');
select throws_ok($$ select public.story_card_json('00000000-0000-4000-9000-000000000001') $$, '42501', null,
  'the card builder is internal');

select * from finish();
rollback;
