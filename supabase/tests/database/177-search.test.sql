-- Database tests for search (story S1-E5-04; CLAUDE.md rule 1).
-- What it proves:
-- - stories are found by title, blurb, a tag's name in any language and the writer's pen name,
--   with Romanian and English stemming (first criterion);
-- - "povesti" finds "Povești" (second criterion);
-- - results leave out stories a reader's age doesn't allow, writers on either side of a block and
--   stories a moderator hid (third criterion);
-- - the 'relevance' sort puts a title match first, and is refused on other lists;
-- - search_writers() finds writers by pen name or username, only when they have a story the reader
--   may see, and never answers a user ID; search_tags() finds approved tags in any language.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The slugs a search finds, in order, as one line.
create function pg_temp.found(term text, sort_order text default null) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by place), '')
  from jsonb_array_elements(public.browse_stories('search', term, sort_order => sort_order) -> 'stories')
    with ordinality as found (story, place);
$$;
-- The same, in alphabetical order, for checks about what is found rather than its order.
create function pg_temp.found_set(term text) returns text language sql as $$
  select coalesce(string_agg(slug, ',' order by slug), '') from unnest(string_to_array(pg_temp.found(term), ',')) as slug;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- teacher (…07) writes as "Ștefana Pop". Five stories: q1 "Povești din bloc"; q2 with "povești"
-- only in its blurb; q3 in English about radios, tagged Fantasy; q4 rated 16+; q5 by blocked
-- (…16), whom blocker (…15) blocks; q6 hidden by a moderator.
update public.profiles set pen_name = 'Ștefana Pop' where id = '00000000-0000-4000-8000-000000000007';
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9177-000000000001', '00000000-0000-4000-8000-000000000007', 'q1', 'Povești din bloc', 'Vecini.', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '5 days', now()),
  ('00000000-0000-4000-9177-000000000002', '00000000-0000-4000-8000-000000000007', 'q2', 'Vara', 'Povestea unei veri la mare.', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '4 days', now()),
  ('00000000-0000-4000-9177-000000000003', '00000000-0000-4000-8000-000000000007', 'q3', 'Static', 'Stories about old radios.', 'en',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '3 days', now()),
  ('00000000-0000-4000-9177-000000000004', '00000000-0000-4000-8000-000000000007', 'q4', 'Povești de noapte', 'x', 'ro',
   (select id from public.categories where slug = 'fiction'), '16_plus', now() - interval '2 days', now()),
  ('00000000-0000-4000-9177-000000000005', '00000000-0000-4000-8000-000000000016', 'q5', 'Povești blocate', 'x', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '1 day', now()),
  ('00000000-0000-4000-9177-000000000006', '00000000-0000-4000-8000-000000000007', 'q6', 'Povești ascunse', 'x', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '6 days', now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select id, user_id, 'srch000' || right(slug, 1), 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()
from public.stories where id::text like '00000000-0000-4000-9177-%';
insert into public.story_tags (story_id, tag_id, user_id)
select '00000000-0000-4000-9177-000000000003', tags.id, '00000000-0000-4000-8000-000000000007'
from public.tags where tags.normalised_name = 'fantasy';
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000016')
on conflict do nothing;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000007', 'story', '00000000-0000-4000-9177-000000000006', 'hidden',
  '00000000-0000-4000-8000-000000000010', 'Test.');

/* ---------- 1. What finds a story ---------- */

select pg_temp.sign_out();
select is(pg_temp.found_set('povesti'), 'q1,q2,q5', 'a visitor: "povesti" finds Povești in titles and blurbs (criteria 1 and 2)');
select is(split_part(pg_temp.found('povesti'), ',', 3), 'q2', 'the two title matches come before the blurb match');
select is(pg_temp.found_set('POVEȘTI'), 'q1,q2,q5', 'capital letters and diacritics don''t matter');
select is(pg_temp.found_set('povestea'), 'q1,q2,q5', 'Romanian word endings match: "povestea" finds "povești"');
select is(pg_temp.found('story radio'), 'q3', 'English word endings match: "story radio" finds "Stories about old radios"');
select is(pg_temp.found('fantezie'), 'q3', 'a tag''s name in another language finds the story');
select is(pg_temp.found_set('stefana'), 'q1,q2,q3', 'the writer''s pen name finds their stories, without diacritics');
select is(pg_temp.found('rad'), 'q3', 'a word typed only in part still finds the story');
select is(pg_temp.found('p'), '', 'a single letter finds nothing');

/* ---------- 2. Who sees what ---------- */

select ok(pg_temp.found('povesti') not like '%q4%', 'a visitor never finds a 16+ story (criterion 3)');
select ok(pg_temp.found('povesti') not like '%q6%', 'nobody else finds a story a moderator hid');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(pg_temp.found('povesti') like '%q4%', 'an adult finds the 16+ story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok(pg_temp.found('povesti') not like '%q5%', 'a reader never finds the stories of someone they blocked');
select throws_ok($$ select public.browse_stories('new', sort_order => 'relevance') $$, '22023', null,
  'relevance is only a sort for search');

/* ---------- 3. Writers and tags ---------- */

select pg_temp.sign_out();
select is((select string_agg(writer ->> 'handle', ',') from jsonb_array_elements(public.search_writers('stefana') -> 'writers') as writer),
  'teacher', 'a writer is found by pen name, without diacritics');
select ok(not (public.search_writers('stefana') -> 'writers' -> 0) ? 'id'
    and not (public.search_writers('stefana') -> 'writers' -> 0) ? 'user_id',
  'and the answer never holds a user ID');
select is((public.search_writers('kid_14') ->> 'total')::integer, 0,
  'an account with no story the reader may see is never found');
select is(public.search_tags('fantez') -> 'tags' -> 0, '{"name": "Fantasy", "story_count": 1}'::jsonb,
  'a tag is found by its name in any language, with the stories the reader may see');

select * from finish();
rollback;
