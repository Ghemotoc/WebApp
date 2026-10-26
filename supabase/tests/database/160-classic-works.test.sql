-- Database tests for adding public-domain classics from the admin site (story S1-E11-16, part
-- 16a; bundle PEOPLE-4).
-- What it proves:
-- - classic_free_markets(): Romania, the EU and the UK 70 years after 1 January following the
--   author's (and the translator's) death; the US by first publication, 95 years;
-- - an admin adds an author, saves a work owned by the classics account, sets its chapters,
--   publishes it (readers then see the source on the story page) and unpublishes it, each logged;
-- - a work not yet free in Romania can't be published; a published text can't be replaced;
-- - a moderator and a member are refused every action; classic_works is readable by the admin
--   (classic_works_select_staff, allowed) and not by a moderator or member (denied).
-- Test data: the seed persona "teacher" stands in for the classics account (the setting is
-- pointed at it inside this transaction, which is rolled back).
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;

update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
create temporary table saved (story_id uuid, author_id uuid);
grant all on saved to authenticated;

/* ---------- 1. The public-domain check ---------- */

select is(public.classic_free_markets(1955, null, 1900, '2026-01-01'),
  '{"RO": true, "EU": true, "UK": true, "US": true}'::jsonb,
  'an author who died in 1955 is free in Romania, the EU and the UK from 1 January 2026');
select is(public.classic_free_markets(1956, null, null, '2026-12-31')->>'RO', 'false',
  'an author who died in 1956 is not free in Romania until 2027');
select is(public.classic_free_markets(1900, 1980, 1880, '2026-06-01')->>'RO', 'false',
  'a translation is not free while its translator''s 70 years run');
select is(public.classic_free_markets(1940, null, 1931, '2026-06-01')->>'US', 'false',
  'the US counts 95 years from first publication');
select is(public.classic_free_markets(1940, null, null, '2026-06-01')->'US', 'null'::jsonb,
  'the US check is unknown without a publication year');

/* ---------- 2. An admin adds a work ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into saved (author_id) select public.admin_add_classic_author('Ion  Creangă', 1889);
select is(public.admin_add_classic_author('ion creangă', 1889), (select author_id from saved),
  'the same author added twice is found, not added again');
select throws_ok($$ select public.admin_add_classic_author('Ion Creangă', 1890) $$, '23514', null,
  'the same name with another year of death is refused');
update saved set story_id = (public.admin_save_classic_work(jsonb_build_object(
  'title', 'Amintiri din copilărie', 'blurb', 'Copilăria la Humulești.',
  'author_id', (select author_id from saved), 'kind', 'novel', 'original_language', 'ro',
  'language_code', 'ro', 'category_slug', 'fiction', 'rating', 'all_ages',
  'source_title', 'Wikisource, ediția 1892', 'source_url', 'https://ro.wikisource.org/wiki/Amintiri_din_copilărie'))
  ->> 'story_id')::uuid;
select pg_temp.sign_out();
select is((select profiles.handle from public.stories join public.profiles on profiles.id = stories.user_id
           where stories.id = (select story_id from saved)), 'teacher',
  'the work belongs to the classics account');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select isnt_empty($$ select 1 from public.classic_works where story_id = (select story_id from saved) $$,
  'allowed: classic_works_select_staff, the admin reads the work''s details');
select is(jsonb_array_length(public.admin_set_classic_chapters((select story_id from saved),
  '[{"title": "I", "body": "Stau câteodată și-mi aduc aminte."}, {"title": "II", "body": "Nică a lui Ștefan."}]'::jsonb)
  -> 'chapters'), 2, 'the admin sets the chapters from the preview');
select throws_ok($$ select public.admin_set_classic_chapters((select story_id from saved), '[]'::jsonb) $$,
  '23514', null, 'an empty text is refused');

/* ---------- 3. Others are refused ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_publish_classic((select story_id from saved)) $$, '42501', null,
  'a moderator can''t publish a classic');
select throws_ok($$ select public.admin_list_classics() $$, '42501', null,
  'a moderator can''t list the classics');
select is_empty($$ select 1 from public.classic_works $$,
  'denied: classic_works_select_staff, a moderator reads no classic details');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_add_classic_author('Someone', 1900) $$, '42501', null,
  'a member can''t add an author');
select is_empty($$ select 1 from public.classic_works $$, 'a member reads no classic details');

/* ---------- 4. Publish and unpublish ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_publish_classic((select story_id from saved)) $$,
  'the admin publishes a work that is free in Romania');
select pg_temp.sign_out();
create temporary table saved_slug as select slug from public.stories where id = (select story_id from saved);
grant select on saved_slug to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_story_page((select slug from saved_slug))
  #>> '{writer,classic_author,source_title}', 'Wikisource, ediția 1892',
  'a reader sees the source edition on the story page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_set_classic_chapters((select story_id from saved), '[{"title": "x", "body": "y"}]'::jsonb) $$,
  '23514', null, 'a published text can''t be replaced');
select lives_ok($$ select public.admin_unpublish_classic((select story_id from saved), 'A reader showed the edition is protected.') $$,
  'the admin unpublishes it with a reason');
update saved set story_id = (public.admin_save_classic_work(jsonb_build_object(
  'title', 'O carte nouă', 'author_id', public.admin_add_classic_author('Autor Recent', 1990),
  'kind', 'poem', 'original_language', 'ro', 'language_code', 'ro', 'category_slug', 'poetry',
  'rating', 'all_ages', 'source_title', 'Ediția 2001', 'source_url', 'https://example.com/carte'))
  ->> 'story_id')::uuid;
select throws_ok($$ select public.admin_publish_classic((select story_id from saved)) $$, '23514', null,
  'a work not free in Romania can''t be published');
select pg_temp.sign_out();
select is(
  (select string_agg(distinct action, ',' order by action) from public.audit_log
   where action like 'classics.%' and created_at = now()),
  'classics.author_added,classics.published,classics.text_set,classics.unpublished,classics.work_saved',
  'every change is in the audit log');

select * from finish();
rollback;
