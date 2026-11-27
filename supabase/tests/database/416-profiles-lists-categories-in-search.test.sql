-- Database tests for adult profiles, public reading lists and categories open to search engines
-- (GROWTH-3; Robert, GROWTH thread, 26 Nov 2026, 15:13 UTC: "Profile for adults, read lists,
-- categories, writers, chapters. Yes.").
-- What it proves, as a signed-out visitor:
-- - profile_search_head() lets an adult's open profile be indexed, with its bio, and never an
--   under-18's, whose bio stays hidden from visitors;
-- - an unknown username has no head;
-- - the sitemap lists the adult writer's profile, their public reading list and the category of
--   a listed story, and leaves out the under-18's profile and list, a private list and a category
--   with no listed story.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- Whether the sitemap lists a path.
create function pg_temp.listed(wanted_path text) returns boolean language sql as $$
  select exists (select 1 from public.sitemap_entries() as entries where entries.path = wanted_path);
$$;

-- adult_writer (18 or over) publishes seed02, a fiction story; both personas have a bio and a
-- public reading list holding it, and adult_writer has a private one too.
update public.stories set first_published_at = now() - interval '1 day',
  last_chapter_published_at = now() - interval '1 day'
where id = '00000000-0000-4000-9000-000000000002';
update public.profiles set bio = 'Scriu despre vreme.'
where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
insert into public.reading_lists (id, user_id, name, is_public) values
  ('00000000-0000-4000-9500-000000000001', '00000000-0000-4000-8000-000000000001', 'Preferate', true),
  ('00000000-0000-4000-9500-000000000002', '00000000-0000-4000-8000-000000000002', 'Ale mele', true),
  ('00000000-0000-4000-9500-000000000003', '00000000-0000-4000-8000-000000000001', 'Secrete', false);
insert into public.reading_list_stories (list_id, user_id, story_id) values
  ('00000000-0000-4000-9500-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002'),
  ('00000000-0000-4000-9500-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000002'),
  ('00000000-0000-4000-9500-000000000003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002');

select pg_temp.sign_out();

/* ---------- 1. The profile's head ---------- */

select is(public.profile_search_head('adult_writer') ->> 'indexable', 'true',
  'an adult''s open profile may be indexed');
select is(public.profile_search_head('adult_writer') ->> 'bio', 'Scriu despre vreme.',
  'and its bio is the description');
select is(public.profile_search_head('teen_17') ->> 'indexable', 'false',
  'an under-18''s profile is never indexed');
select is(public.profile_search_head('teen_17') ->> 'bio', '',
  'and its bio stays hidden from visitors');
select is(public.profile_search_head('nobody_has_this_name'), null,
  'an unknown username has no head');

/* ---------- 2. The sitemap ---------- */

select ok(pg_temp.listed('/u/adult_writer'), 'the sitemap lists the adult writer''s profile');
select ok(not pg_temp.listed('/u/teen_17'), 'and never the under-18''s');
select ok(pg_temp.listed('/library/lists/00000000-0000-4000-9500-000000000001'),
  'it lists the adult''s public reading list');
select ok(not pg_temp.listed('/library/lists/00000000-0000-4000-9500-000000000002')
  and not pg_temp.listed('/library/lists/00000000-0000-4000-9500-000000000003'),
  'and neither the under-18''s list nor a private one');
select ok(pg_temp.listed('/discover/c/fiction'), 'it lists the category of a listed story');
select ok(not pg_temp.listed('/discover/c/nonfiction_essays'),
  'and not a category with no listed story');

select * from finish();
rollback;
