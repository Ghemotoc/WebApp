-- Database tests for publishing, updating and unpublishing chapters (story S1-E3-03; ADR 0004).
-- What it proves:
-- - publish_chapter(): the draft becomes the published copy; the story becomes public (a
--   signed-out visitor and teen_17 get the page, with the chapter in the list); the story's
--   last-updated date moves; a revision and a 'chapter_published' job (IDs only) are written;
--   nothing else is held or checked (Q42, Q43);
-- - an empty draft, an already published chapter, someone else's chapter and read-only accounts
--   are refused; a visitor can't call it;
-- - update_published_chapter(): readers see the saved draft after "Update chapter", edited_at is
--   set, an 'edited' revision is written, no new job (Q10);
-- - unpublish_chapter(): readers can't see it, chapter_is_readable() is false (S1-E6-01 hides its
--   comments), the published copy is kept; the story stops being public with its last chapter.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- Created before anyone signs in, so it runs with the test's own rights, not a persona's.
create function pg_temp.chapter_id(chapter_code text) returns uuid language sql security definer as $$
  select id from public.chapters where chapters.code = chapter_code $$;

-- Two chapters on adult_writer's seed story, the first with text, the second empty.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table made as
  select (public.create_chapter('statia-meteo-seed01')) ->> 'code' as first_code,
         (public.create_chapter('statia-meteo-seed01')) ->> 'code' as second_code;
grant select on made to authenticated, anon;
create function pg_temp.first() returns text language sql as $$ select first_code from made $$;
create function pg_temp.second() returns text language sql as $$ select second_code from made $$;
select public.save_chapter_draft(pg_temp.first(), 'Caietele', 'Bunica **notează** vremea.', 1);

-- 1. Before publishing: private.
select pg_temp.sign_out();
select is(public.get_story_page('statia-meteo-seed01'), null, 'a story with no published chapter is not public');

-- 2. The refusals.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.publish_chapter(pg_temp.second())) ->> 'outcome', 'empty', 'an empty chapter can''t be published');
select is((public.publish_chapter('nochaptr')) ->> 'outcome', 'not_found', 'an unknown code gives not_found');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.publish_chapter(pg_temp.first())) ->> 'outcome', 'not_found', 'another writer can''t publish someone else''s chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.publish_chapter(pg_temp.first())) ->> 'outcome', 'not_active', 'kid_14_waiting can''t publish');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.publish_chapter(pg_temp.first())) ->> 'outcome', 'not_active', 'teen_17 can''t publish while the test is for invited adults');
select pg_temp.sign_out();
select throws_ok($$ select public.publish_chapter(pg_temp.first()) $$, '42501', null, 'a visitor can''t call publish_chapter()');

-- 3. Publish.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.publish_chapter(pg_temp.first())) ->> 'outcome', 'ok', 'adult_writer publishes chapter one');
select is((public.publish_chapter(pg_temp.first())) ->> 'outcome', 'wrong_state', 'publishing it again is refused');
reset role;
select results_eq(
  $$ select status::text, published_title, published_body, first_published_at is not null, published_word_count
     from public.chapters where code = pg_temp.first() $$,
  $$ values ('published', 'Caietele', 'Bunica **notează** vremea.', true, 3) $$,
  'the draft became the published copy'
);
select isnt((select last_chapter_published_at from public.stories where slug = 'statia-meteo-seed01'), null,
  'the story''s last-updated date moved');
select is((select count(*)::integer from public.chapter_revisions where chapter_id = pg_temp.chapter_id(pg_temp.first()) and reason = 'published'),
  1, 'a "published" revision was written');
select results_eq(
  $$ select kind, payload ? 'chapter_id', payload ? 'story_id', payload ? 'user_id' from public.jobs where kind = 'chapter_published' $$,
  $$ values ('chapter_published', true, true, false) $$,
  'one chapter_published job, with IDs only and never the user ID (S1-E7-01 reads it)'
);

-- 4. Readers see it, with the chapter in the list numbered among the published ones.
select pg_temp.sign_out();
select is((public.get_story_page('statia-meteo-seed01')) ->> 'is_public', 'true', 'a visitor gets the story page now');
select results_eq(
  $$ select jsonb_array_length(page -> 'chapters'), page -> 'chapters' -> 0 ->> 'number', page -> 'chapters' -> 0 ->> 'title'
     from public.get_story_page('statia-meteo-seed01') as page $$,
  $$ values (1, '1', 'Caietele') $$,
  'readers see only the published chapter, as number 1, with its published title'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select isnt(public.get_story_page('statia-meteo-seed01'), null, 'teen_17 gets the All ages story too');
select is(public.chapter_is_readable(pg_temp.chapter_id(pg_temp.first())), true, 'chapter_is_readable() is true');
select is(public.chapter_is_readable(pg_temp.chapter_id(pg_temp.second())), false, 'a draft is not readable');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(jsonb_array_length((public.get_story_page('statia-meteo-seed01')) -> 'chapters'), 2,
  'the owner''s preview lists the draft too');

-- 5. Update the published chapter (Q10): the draft changes first, readers see it after the update.
select public.save_chapter_draft(pg_temp.first(), 'Caietele bunicii', 'Text nou.', 2);
select pg_temp.sign_out();
select is((public.get_story_page('statia-meteo-seed01')) -> 'chapters' -> 0 ->> 'title', 'Caietele',
  'until the update, readers still see the published title');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.update_published_chapter(pg_temp.first())) ->> 'outcome', 'ok', 'the writer presses "Update chapter"');
select is((public.update_published_chapter(pg_temp.second())) ->> 'outcome', 'wrong_state', 'a draft can''t be "updated"');
reset role;
select results_eq(
  $$ select published_title, published_body, edited_at is not null from public.chapters where code = pg_temp.first() $$,
  $$ values ('Caietele bunicii', 'Text nou.', true) $$,
  'readers now get the new text, with an "Edited on" date'
);
select is((select count(*)::integer from public.jobs where kind = 'chapter_published'), 1, 'an update queues no new job');

-- 6. Unpublish: hidden, kept, and the story goes private with its last chapter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.unpublish_chapter(pg_temp.first())) ->> 'outcome', 'ok', 'the writer unpublishes it');
select is((public.unpublish_chapter(pg_temp.first())) ->> 'outcome', 'wrong_state', 'a draft can''t be unpublished');
select is(public.chapter_is_readable(pg_temp.chapter_id(pg_temp.first())), false,
  'chapter_is_readable() is false, so its comments are hidden (S1-E6-01)');
reset role;
select results_eq(
  $$ select status::text, published_body, unpublished_at is not null from public.chapters where code = pg_temp.first() $$,
  $$ values ('draft', 'Text nou.', true) $$,
  'the published copy is kept'
);
select pg_temp.sign_out();
select is(public.get_story_page('statia-meteo-seed01'), null, 'with no published chapter left, the story is private again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.get_story_page('statia-meteo-seed01')) ->> 'is_public', 'false', 'the owner''s preview says it isn''t public');

select * from finish();

rollback;
