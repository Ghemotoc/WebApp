-- Database tests for Robert's fixes of 6 Nov 2026 (migrations
-- 20270202110001_fix_classics_year_and_status.sql and 20270202110002_fix_staff_avatar_save.sql).
-- What it proves:
-- - a classic's first publication year, saved by staff in classic_works, is copied onto its story
--   and returned by story_classic_author() for the story page;
-- - the year must be a plausible year;
-- (That every classic is Completed is checked in scripts/build-demo-content.test.ts: a fresh
-- database has no classics account, so the migration's update finds nothing here.)
-- - a staff account can now save its own drawn avatar, while a suspended account and a signed-out
--   visitor still can't.
-- No table or policy changes (one new column on stories, read only through functions), so there
-- is no allowed or denied policy test here.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

-- A fresh password sign-in, as Supabase's tokens carry it.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- A recipe the builder could have made.
create function pg_temp.recipe() returns jsonb language sql as $$
  select '{"style": "micah", "version": 1, "skin": "d08b5b", "hair": "full", "hairColour": "2c1b18",
           "eyebrows": "up", "eyes": "eyes", "mouth": "smile", "nose": "curve", "facialHair": "none",
           "glasses": "round", "earrings": "none", "extrasColour": "2c1b18", "shirt": "crew",
           "shirtColour": "8fa7df", "background": "f1eaf4"}'::jsonb;
$$;

/* ---------- 1. The year a classic was first published ---------- */

-- A classic of our own: an author, a story and its classic_works row. A fresh database has no
-- classics account (the demo top-up adds it), so a seed writer holds the story here.
insert into public.classic_authors (name, died_year)
values ('Test Classic Author', 1850);
insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
    completion_status, rating, classic_author_id)
values ('00000000-0000-4000-8000-000000000001', 'fix-test-classic', 'Fix test classic', 'x', 'en',
    (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages',
    (select id from public.classic_authors where name = 'Test Classic Author'));
insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
    first_published_year, added_by_user_id)
select id, 'short_story', 'en', 'A source edition', 'https://example.org/source', 1843,
    '00000000-0000-4000-8000-000000000008'
from public.stories where slug = 'fix-test-classic';

select is(
  (select first_published_year from public.stories where slug = 'fix-test-classic'),
  1843,
  'the year staff saved for a classic is copied onto its story');

update public.classic_works set first_published_year = 1844
where story_id = (select id from public.stories where slug = 'fix-test-classic');
select is(
  public.story_classic_author((select id from public.stories where slug = 'fix-test-classic'))
    ->> 'first_published_year',
  '1844',
  'a corrected year reaches the story page through story_classic_author()');

select throws_ok(
  $$ update public.stories set first_published_year = 3000 where slug = 'fix-test-classic' $$,
  '23514', null,
  'a year that can''t be a publication year is refused');

/* ---------- 3. Staff can save their own avatar ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(public.set_my_avatar_recipe(pg_temp.recipe()), pg_temp.recipe(),
  'the owner, a staff account, saves their own avatar');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.set_my_avatar_recipe(null), null, 'an admin, a staff account, goes back to the initials');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a suspended account still can''t change its avatar');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a signed-out visitor still can''t save an avatar');

select * from finish();
rollback;
