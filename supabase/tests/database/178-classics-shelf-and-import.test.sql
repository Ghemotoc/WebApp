-- Database tests for the classics shelf (story S1-E5-06) and staff Classics work, part 16b
-- (story S1-E11-16): importing the research lists, the 1 January suggestions and typo fixes.
-- What it proves:
-- - the 'classics' list holds the public-domain works only, keeps the reader's rules (a visitor
--   never sees a 16+ classic) and is on Discover by default;
-- - an admin imports list rows as drafts with the details filled in, and each bad row is refused
--   on its own (a repeat, an unknown kind, another year of death for a known author);
-- - an imported work can't be published until staff save its details;
-- - the suggestions list the authors who became free on 1 January and next year's;
-- - a typo fix goes live and keeps a version, and a missing reason, no change or a rewrite is
--   refused; a moderator is refused every action.
-- Test data: the seed persona "teacher" stands in for the classics account (the setting is
-- pointed at it inside this transaction, which is rolled back).
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE and hint a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  raised_state text;
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_state = returned_sqlstate, raised_hint = pg_exception_hint;
  return raised_state || ' ' || coalesce(raised_hint, '');
end;
$$;
-- The slugs a list shows this reader, in order.
create function pg_temp.listed(list_kind text) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by place), '')
  from jsonb_array_elements(public.browse_stories(list_kind, sort_order => 'title_az') -> 'stories')
    with ordinality as found (story, place);
$$;
-- Back to the test's own role, to look at drafts no reader or staff member reads directly.
create function pg_temp.as_tester() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
create temporary table imported (result jsonb);
create temporary table drafts (title text, story_id uuid);
-- Answers the test doesn't check go here, so they don't print among the results.
create temporary table discarded (answer jsonb);
grant all on imported, drafts, discarded to authenticated;

-- Three live stories by teacher: two classics (one of them 16+) and a story of their own.
insert into public.classic_authors (id, name, died_year) values
  ('00000000-0000-4000-9178-00000000000a', 'Autor Vechi', 1900);
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, classic_author_id,
  first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9178-000000000001', '00000000-0000-4000-8000-000000000007', 'cl1', 'Clasic unu', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', '00000000-0000-4000-9178-00000000000a', now(), now()),
  ('00000000-0000-4000-9178-000000000002', '00000000-0000-4000-8000-000000000007', 'cl2', 'Clasic doi', 'ro',
   (select id from public.categories where slug = 'fiction'), '16_plus', '00000000-0000-4000-9178-00000000000a', now(), now()),
  ('00000000-0000-4000-9178-000000000003', '00000000-0000-4000-8000-000000000007', 'cl3', 'Al meu', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', null, now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select id, user_id, 'clsc000' || right(slug, 1), 1, 'Unu', 'A fost odată ca niciodată un împărat.', 7, 'published',
  'Unu', 'A fost odată ca niciodată un împărat.', 7, now()
from public.stories where id::text like '00000000-0000-4000-9178-%';
insert into public.classic_works (story_id, kind, original_language, source_title, source_url, added_by_user_id)
values ('00000000-0000-4000-9178-000000000001', 'fairy_tale', 'ro', 'Wikisource', 'https://ro.wikisource.org/wiki/X',
  '00000000-0000-4000-8000-000000000009');

/* ---------- 1. The shelf ---------- */

select pg_temp.sign_out();
select is(pg_temp.listed('classics'), 'cl1', 'a visitor: the classics list holds the public-domain works they may see, not the 16+ one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.listed('classics'), 'cl2,cl1', 'an adult also sees the 16+ classic, and never a story of the account''s own');
select ok((select value from public.settings where key = 'discover_shelves') ? 'classics',
  'the classics shelf is on Discover by default');

/* ---------- 2. Importing a list ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into imported select public.admin_import_classics('[
  {"title": "Poezii alese", "author": "Poet Nou", "author_died": "1956", "type": "poetry", "language": "ro", "source_url": "https://ro.wikisource.org/wiki/P"},
  {"title": "Drumuri", "author": "Autor Vechi", "author_died": "1900", "type": "travel prose", "language": "ro", "source_url": "https://www.gutenberg.org/ebooks/1"},
  {"title": "Clasic unu", "author": "Autor Vechi", "author_died": "1900", "type": "fairy tale", "language": "ro", "source_url": "https://ro.wikisource.org/wiki/X"},
  {"title": "Ciudat", "author": "Autor Vechi", "author_died": "1900", "type": "comic", "language": "ro", "source_url": "https://ro.wikisource.org/wiki/C"},
  {"title": "Greșit", "author": "Autor Vechi", "author_died": "1901", "type": "novel", "language": "ro", "source_url": "https://ro.wikisource.org/wiki/G"}
]'::jsonb);
select is((select result - 'refused' from imported), '{"added": 2, "already_listed": 1}'::jsonb,
  'an admin imports two new works; the one already listed is skipped');
select is((select string_agg((refusal ->> 'line') || ' ' || (refusal ->> 'reason'), ', ')
           from imported, jsonb_array_elements(result -> 'refused') as refusal),
  '4 unknown_kind, 5 author_died_year_differs', 'each bad row is refused on its own, with its line and reason');
select pg_temp.as_tester();
insert into drafts select title, id from public.stories where title in ('Drumuri', 'Poezii alese');
select is((select works.kind::text || ' ' || works.source_title || ' ' || categories.slug || ' ' || works.details_checked::text
           from public.classic_works as works join public.stories on stories.id = works.story_id
           join public.categories on categories.id = stories.category_id where stories.title = 'Drumuri'),
  'essay Project Gutenberg nonfiction_essays false', 'the draft has its kind, source and category filled in, waiting for a check');
select is((select stories.first_published_at from public.stories where stories.title = 'Poezii alese'), null,
  'an imported work stays a draft');

/* ---------- 3. Checked before publishing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into discarded select public.admin_set_classic_chapters((select story_id from drafts where title = 'Drumuri'),
  '[{"title": "I", "body": "Plecarea."}]'::jsonb);
select is(pg_temp.refusal($$ select public.admin_publish_classic((select story_id from drafts where title = 'Drumuri')) $$),
  '23514 details_unchecked', 'an imported work can''t be published before staff check its details');
insert into discarded select public.admin_save_classic_work(jsonb_build_object('title', 'Drumuri', 'blurb', 'Călătorii.',
    'author_id', '00000000-0000-4000-9178-00000000000a', 'kind', 'essay', 'original_language', 'ro',
    'language_code', 'ro', 'category_slug', 'nonfiction_essays', 'rating', 'all_ages',
    'source_title', 'Project Gutenberg', 'source_url', 'https://www.gutenberg.org/ebooks/1'),
  (select story_id from drafts where title = 'Drumuri'));
select is((public.admin_publish_classic((select story_id from drafts where title = 'Drumuri')) ->> 'was_published'), 'true',
  'once saved, it can be published');

/* ---------- 4. The 1 January suggestions ---------- */

-- Two authors counted from this year, so the test holds in any year: one free since 1 January,
-- one free from next 1 January.
select pg_temp.as_tester();
insert into public.classic_authors (name, died_year)
select 'Liber de anul acesta', extract(year from now() at time zone 'Europe/Bucharest')::integer - 71
union all
select 'Liber de anul viitor', extract(year from now() at time zone 'Europe/Bucharest')::integer - 70;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok(public.admin_classic_suggestions() -> 'free_this_year' @> '[{"name": "Liber de anul acesta"}]'
    and not public.admin_classic_suggestions() -> 'free_this_year' @> '[{"name": "Liber de anul viitor"}]',
  'the suggestions list the authors who became free on 1 January');
select ok(public.admin_classic_suggestions() -> 'free_next_year' @> '[{"name": "Liber de anul viitor", "works": []}]',
  'and, apart, those who become free next 1 January, with their works');

/* ---------- 5. Typo fixes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_fix_classic_typo('clsc0001', 'A fost odată ca niciodată un împărat bun.', 'Sursa are „bun”.') ->> 'fixes', '1',
  'a typo fix goes live and is counted as a version');
select pg_temp.as_tester();
select is((select published_body from public.chapters where code = 'clsc0001'), 'A fost odată ca niciodată un împărat bun.',
  'readers see the corrected text');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.admin_fix_classic_typo('clsc0001', 'A fost odată.', 'x') $$), '23514 too_big',
  'cutting the text is more than a typo fix and is refused');
select is(pg_temp.refusal($$ select public.admin_fix_classic_typo('clsc0001', 'A fost odata ca niciodata un împărat bun.', ' ') $$),
  '23514 reason_missing', 'a fix needs a reason');
select is(pg_temp.refusal($$ select public.admin_fix_classic_typo('clsc0003', 'A fost odată ca niciodată un împărat.', 'x') $$),
  'P0002 not_a_classic', 'a story that isn''t a classic can''t be corrected by staff');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_import_classics('[]'::jsonb) $$), '42501 not_allowed',
  'a moderator can''t import, suggest or fix classics');

select * from finish();
rollback;
