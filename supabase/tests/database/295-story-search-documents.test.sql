-- QA-2a: the stored search rows (story_search_documents) stay up to date and stay staff-only
-- (independent QA check, 5 Nov 2026, findings P1 and P2).
--
-- What it proves:
-- - policy story_search_documents_select_staff: a moderator reads the search rows (allowed); a
--   member and a signed-out visitor read none (denied), so nobody skips browse_stories()'s rating,
--   block and visibility rules by reading the rows directly;
-- - the triggers keep a story's row in step with what search has always looked at: a new story,
--   a changed title, a title staff hid, an approved tag added, and a change of the writer's handle;
-- - search through browse_stories() finds a story by each of those, exactly as before QA-2.
-- Personas: adult_writer (…01, the writer), teacher (…07, a member), moderator (…10, staff).
-- Test data is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- The stored search text of the test story, read as postgres.
create function pg_temp.search_text() returns text language sql as $$
  select search_text from public.story_search_documents where story_id = '00000000-0000-4000-9295-000000000001';
$$;
-- How many stories a search finds, as the current caller.
create function pg_temp.found(term text) returns integer language sql as $$
  select (public.browse_stories('search', term) ->> 'total')::integer;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Test data, written as postgres ---------- */

insert into public.stories (id, user_id, title, slug, rating, language_code, category_id, first_published_at)
values ('00000000-0000-4000-9295-000000000001', '00000000-0000-4000-8000-000000000001',
  'Fluturele zirconic', 'fluturele-zirconic-qa295', 'all_ages', 'ro',
  (select id from public.categories limit 1), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9295-000000000001', '00000000-0000-4000-8000-000000000001', 'qa295ch1', 1,
  'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());

/* ---------- 1. Who may read the rows ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok((select count(*) from public.story_search_documents) > 0,
  'allowed: story_search_documents_select_staff (a moderator reads the stored search rows)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_search_documents), 0,
  'denied: story_search_documents_select_staff (a member reads no search rows directly)');
select pg_temp.as_visitor();
select throws_ok($$ select count(*) from public.story_search_documents $$, '42501', null,
  'denied: a signed-out visitor can''t read the table at all');
reset role;

/* ---------- 2. The triggers keep the row up to date ---------- */

select ok(pg_temp.search_text() like '%zirconic%', 'a new story gets its search row at once');

update public.stories set title = 'Fluturele cobaltic' where id = '00000000-0000-4000-9295-000000000001';
select ok(pg_temp.search_text() like '%cobaltic%' and pg_temp.search_text() not like '%zirconic%',
  'a changed title replaces the old one in the row');

insert into public.tags (name, normalised_name, status) values ('vulcanologie', 'vulcanologie', 'approved');
insert into public.story_tags (story_id, tag_id, user_id)
select '00000000-0000-4000-9295-000000000001', id, '00000000-0000-4000-8000-000000000001'
from public.tags where normalised_name = 'vulcanologie';
select ok(pg_temp.search_text() like '%vulcanologie%', 'an approved tag added to the story is in the row');

update public.profiles set handle = 'scriitoarea_qa295' where id = '00000000-0000-4000-8000-000000000001';
select ok(pg_temp.search_text() like '%scriitoarea_qa295%', 'a new handle of the writer is in the row');

/* ---------- 3. Search finds the story by each of them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.found('cobaltic'), 1, 'search finds the story by its new title');
select is(pg_temp.found('zirconic'), 0, 'and no longer by its old one');
select is(pg_temp.found('vulcanologie'), 1, 'search finds the story by its tag');
select is(pg_temp.found('scriitoarea_qa295'), 1, 'search finds the story by the writer''s new handle');
reset role;

-- A title staff hid stops matching for everyone else (S1-E11-08).
update public.stories set title_hidden_at = now() where id = '00000000-0000-4000-9295-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.found('cobaltic'), 0, 'a title staff hid no longer finds the story');
reset role;

select * from finish();
rollback;
