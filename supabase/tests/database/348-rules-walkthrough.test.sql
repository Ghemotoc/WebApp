-- Database tests for the rules walkthrough before an under-18's first comment or post (bundle
-- MUST-1, part c; IDEA-20261108-7).
-- What it proves:
-- - someone under 18 who may post needs the walkthrough until they finish or skip it, then never
--   again; one who can't post yet (adults_only on) doesn't, so the box says why instead;
-- - finishing twice keeps the first time;
-- - adults and signed-out visitors never need it, and signed out nobody can record it;
-- - the four cards are help pages in the CMS, in English and Romanian, that pass the same checks
--   as a page published from Staff › Website, with ș and ț written with a comma below.
-- Personas: adult_writer (…01), teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Under 18 ---------- */

-- While the March test is adults only, teen_17 can't post, so the box answers first.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.needs_rules_walkthrough(), false,
  'a 17-year-old who can''t post yet is told so instead of seeing the cards');
reset role;
update public.feature_flags set is_enabled = false where key = 'adults_only';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.needs_rules_walkthrough(), true, 'a 17-year-old sees the walkthrough before a first post');
select lives_ok($$ select public.finish_rules_walkthrough() $$, 'and can finish or skip it');
select is(public.needs_rules_walkthrough(), false, 'after which it never shows again');

reset role;
create temporary table first_seen as
  select rules_walkthrough_seen_at as seen_at from public.profiles
  where id = '00000000-0000-4000-8000-000000000002';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.finish_rules_walkthrough();
reset role;
select is(
  (select rules_walkthrough_seen_at from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
  (select seen_at from first_seen),
  'finishing it a second time keeps the first time');

/* ---------- 2. Adults and visitors ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.needs_rules_walkthrough(), false, 'an adult never sees it');

select pg_temp.sign_out();
select throws_ok($$ select public.needs_rules_walkthrough() $$, '42501', null,
  'a signed-out visitor can''t ask');
select throws_ok($$ select public.finish_rules_walkthrough() $$, '42501', null,
  'and can''t record it');

/* ---------- 3. The cards in the CMS ---------- */

reset role;
select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and market_code is null and status = 'published'
     and entry_key like 'rules-walkthrough-%'),
  8::bigint, 'the four cards are published in English and Romanian');
select is(
  (select count(*) from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.entry_key like 'rules-walkthrough-%'
     and cardinality(public.cms_content_problems(versions)) > 0),
  0::bigint, 'every card passes the checks a page published from Staff › Website passes');
select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and language_code = 'ro' and entry_key like 'rules-walkthrough-%'
     and content::text ~ '[şţŞŢ]'),
  0::bigint, 'the Romanian cards use ș and ț with a comma below');

select * from finish();
rollback;
