-- Database tests for the reader's sort on every story list (story S1-E5-02).
-- What it proves:
-- - each of the six sorts orders the list as the drop-down says (criterion 1);
-- - titles and writers sort in Romanian alphabetical order: a, ă, b … s, ș … (criterion 2);
-- - ties go to the newer story, and a sorted list pages without overlap (criterion 3);
-- - a sort never shows what the reader may not see (rule 18);
-- - no sort means the list's own order (popular since S1-E5-03), and an unknown sort is refused.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The slugs of one page of the "sorttest" tag list, in order.
create function pg_temp.sorted(sort_order text, page_size integer default 21, page_offset integer default 0)
returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(
    public.browse_stories('tag', 'sorttest', sort_order => sort_order, page_size => page_size,
      page_offset => page_offset) -> 'stories') with ordinality as listed(story, position);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Three writers with Romanian pen names: teacher "Ana", teen_17 "Sorin", adult_writer "Ștefan".
update public.profiles set pen_name = 'Ana' where id = '00000000-0000-4000-8000-000000000007';
update public.profiles set pen_name = 'Sorin' where id = '00000000-0000-4000-8000-000000000002';
update public.profiles set pen_name = 'Ștefan' where id = '00000000-0000-4000-8000-000000000001';

-- Six stories, all tagged "sorttest". s1 is the oldest story but has the latest chapter; s6 is 16+.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9152-000000000001', '00000000-0000-4000-8000-000000000007', 's1', 'Zori', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '6 hours', now() - interval '10 minutes'),
  ('00000000-0000-4000-9152-000000000002', '00000000-0000-4000-8000-000000000001', 's2', 'Ana', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '5 hours', now() - interval '50 minutes'),
  ('00000000-0000-4000-9152-000000000003', '00000000-0000-4000-8000-000000000002', 's3', 'Ăla', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '4 hours', now() - interval '40 minutes'),
  ('00000000-0000-4000-9152-000000000004', '00000000-0000-4000-8000-000000000001', 's4', 'Șase', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '3 hours', now() - interval '30 minutes'),
  ('00000000-0000-4000-9152-000000000005', '00000000-0000-4000-8000-000000000002', 's5', 'Sapte', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', now() - interval '2 hours', now() - interval '20 minutes'),
  ('00000000-0000-4000-9152-000000000006', '00000000-0000-4000-8000-000000000001', 's6', 'Bal', 'ro',
   (select id from public.categories where slug = 'fiction'), '16_plus', now() - interval '1 hour', now() - interval '1 hour');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select id, user_id, 'sort000' || right(slug, 1), 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()
from public.stories where id::text like '00000000-0000-4000-9152-%';
insert into public.tags (name, normalised_name) values ('sorttest', 'sorttest');
insert into public.story_tags (story_id, tag_id, user_id)
select stories.id, tags.id, stories.user_id from public.stories, public.tags
where stories.id::text like '00000000-0000-4000-9152-%' and tags.normalised_name = 'sorttest';

/* ---------- 1. Each sort, as a visitor (the 16+ "Bal" is never there) ---------- */

select pg_temp.sign_out();
select is(pg_temp.sorted('updated'), 's1,s5,s4,s3,s2', 'Recently updated: the latest chapter first');
select is(pg_temp.sorted('newest'), 's5,s4,s3,s2,s1', 'Newest: the story first published last comes first');
select is(pg_temp.sorted('oldest'), 's1,s2,s3,s4,s5', 'Oldest: the first story published comes first');
select is(pg_temp.sorted('title_az'), 's2,s3,s5,s4,s1',
  'Title A to Z in Romanian order: Ana, Ăla, Sapte, Șase, Zori');
select is(pg_temp.sorted('title_za'), 's1,s4,s5,s3,s2', 'Title Z to A is the same order backwards');
select is(pg_temp.sorted('writer'), 's1,s5,s3,s4,s2',
  'Writer A to Z: Ana, Sorin, Ștefan; one writer''s stories newest first');
select is(pg_temp.sorted(null), 's5,s4,s3,s2,s1',
  'no sort means popular (S1-E5-03); with no scores yet, the newer story first');

/* ---------- 2. Paging a sorted list ---------- */

select is(pg_temp.sorted('title_az', 2, 0) || ',' || pg_temp.sorted('title_az', 2, 2) || ',' || pg_temp.sorted('title_az', 2, 4),
  's2,s3,s5,s4,s1', 'a sorted list pages without a gap or an overlap');
select is((public.browse_stories('tag', 'sorttest', sort_order => 'writer') ->> 'total')::integer, 5,
  'and the total is the same whatever the sort');

/* ---------- 3. Ratings still apply under every sort (rule 18) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.sorted('title_az'), 's2,s3,s6,s5,s4,s1', 'an adult sees the 16+ story too, in its place: Ăla, Bal');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(pg_temp.sorted('writer') not like '%s6%', 'a 14-year-old never sees it, whatever the sort');

/* ---------- 4. Refusals ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.browse_stories('updated', sort_order => 'loudest') $$, '22023', 'Unknown sort.',
  'a sort that doesn''t exist is refused');
select is(public.browse_stories('new', sort_order => null) ->> 'total', public.browse_stories('new') ->> 'total',
  'the new list without a sort is the same list');

select * from finish();
rollback;
