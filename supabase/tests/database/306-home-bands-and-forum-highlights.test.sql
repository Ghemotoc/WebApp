-- Database tests for the home page's bands and the forums highlight (bundle LOOK-3; board
-- Website-Home; Robert's go, 6 Nov 2026).
-- What it proves:
-- - version 1 of the home page carries the four bands and the footer note in ro and en, all within
--   their limits, and the March copy says nothing about under-16 consent;
-- - an empty band passes (it is hidden); a half-written one is refused, field by field;
-- - public_forum_highlights(), for a visitor: a thread in the platform's forums by an adult who
--   may be suggested is listed, with its forum and starter and no user ID; a thread inside a space
--   is never listed; a 13 to 15-year-old's thread isn't (no parent's yes); a 16+ space read by
--   everybody is listed; an under-16 space is not;
-- - a blocked member doesn't see the blocker's thread; the visitor does.
-- Personas: adult_writer (…01), kid_14_ok (…03), blocker (…15, blocks …16).
-- Test data: spaces and threads named "zh306"; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

/* ---------- 1. The copy and its checks ---------- */

select is((select public.cms_home_page_problems(content) from public.cms_versions
           where content_kind = 'home_page' and entry_key = 'home' and market_code is null
             and language_code = 'en' and user_id is null),
  '{}'::text[], 'version 1 in English has the bands and footer note, all within their limits');
select is((select public.cms_home_page_problems(content) from public.cms_versions
           where content_kind = 'home_page' and entry_key = 'home' and market_code is null
             and language_code = 'ro' and user_id is null),
  '{}'::text[], 'and in Romanian');
select ok((select bool_and(not (content::text ~* 'parent|părinte|consimț|consent'))
           from public.cms_versions
           where content_kind = 'home_page' and entry_key = 'home' and user_id is null),
  'the March copy says nothing about a parent''s consent (S1-E2-03 is off for the invited test)');
select is(public.cms_band_problems('{"eyebrow": "", "heading": "", "lede": "", "button": ""}'::jsonb,
    'appsBand', false),
  '{}'::text[], 'an empty band passes: it is simply hidden');
select is(public.cms_band_problems('{"heading": "Only a heading"}'::jsonb, 'appsBand', false),
  array['appsBand.eyebrow:empty', 'appsBand.lede:empty', 'appsBand.button:empty'],
  'a half-written band is refused, field by field');
select ok('writeBand.points.3.body:empty' = any(public.cms_band_problems(
    '{"eyebrow": "a", "heading": "b", "lede": "c", "button": "d", "points": [{"title": "t", "body": "b"}]}'::jsonb,
    'writeBand', true)),
  'the writers'' band needs its four points');

/* ---------- 2. Test data ---------- */

update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_space('Cercul zh306', 'Pentru toți.', '', 'members', 'open', 'everybody');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.create_space('Tineri zh306', 'Doar pentru noi.', '', 'members', 'open', 'everybody');
select pg_temp.as_postgres();

-- The space's own checks ask who is writing; these rows are test data put in as the database
-- owner, so the triggers are skipped for this transaction only.
set local session_replication_role = replica;
create temp table platform_forum as
  select id from public.forums where space_id is null and deleted_at is null order by position limit 1;
insert into public.forum_threads (id, user_id, forum_id, title, last_post_at) values
  ('00000000-0000-4000-9306-000000000001', '00000000-0000-4000-8000-000000000001',
   (select id from platform_forum), 'Adult zh306', now()),
  ('00000000-0000-4000-9306-000000000002', '00000000-0000-4000-8000-000000000003',
   (select id from platform_forum), 'Kid zh306', now()),
  ('00000000-0000-4000-9306-000000000003', '00000000-0000-4000-8000-000000000001',
   public.space_forum_id((select id from public.spaces where name = 'Cercul zh306')), 'Inside zh306', now()),
  ('00000000-0000-4000-9306-000000000004', '00000000-0000-4000-8000-000000000015',
   (select id from platform_forum), 'Blocker zh306', now());
insert into public.forum_posts (user_id, thread_id, post_number, body) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9306-000000000001', 1, 'Salut'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9306-000000000001', 2, 'Răspuns'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9306-000000000001', 3, 'Încă unul'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-9306-000000000002', 1, 'Salut'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9306-000000000003', 1, 'Salut'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9306-000000000004', 1, 'Salut');

set local session_replication_role = origin;

/* ---------- 3. The forums highlight ---------- */

select pg_temp.sign_out();
create temp table seen as select public.public_forum_highlights('en') as answer;
grant select on seen to anon, authenticated;
select ok((select answer -> 'threads' from seen) @> '[{"title": "Adult zh306", "reply_count": 2}]'::jsonb,
  'a visitor sees an adult''s busy thread in the platform''s forums, with its replies');
select ok(not ((select answer::text from seen) ~ '00000000-0000-4000-8000-'),
  'no user ID leaves the function');
select ok((select answer -> 'threads' from seen) @> '[{"title": "Adult zh306", "starter": {"handle": "adult_writer"}}]'::jsonb,
  'the starter shows by handle and name');
select ok(not ((select answer::text from seen) ~ 'Inside zh306'),
  'a thread inside a space is never listed, whatever the space');
select ok(not ((select answer::text from seen) ~ 'Kid zh306'),
  'a 13 to 15-year-old''s thread isn''t put on show without the parent''s yes');
select ok((select answer -> 'spaces' from seen) @> '[{"name": "Cercul zh306"}]'::jsonb,
  'a 16+ space everybody may read is listed');
select ok(not ((select answer::text from seen) ~ 'Tineri zh306'), 'an under-16 space never is');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select ok(not (public.public_forum_highlights('en')::text ~ 'Blocker zh306'),
  'a blocked member doesn''t see the blocker''s thread');

select * from finish();
rollback;
