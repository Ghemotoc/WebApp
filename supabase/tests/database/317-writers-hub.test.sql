-- Database tests for what the Writers' hub and the Resources page read (bundle G9 WRITING, part a;
-- CLAUDE.md rules 1 and 4).
-- What it proves:
-- - writers_hub_contests() lists a contest only while it takes entries, only to a signed-in
--   writer in its age groups and market, with its landing page's address; a visitor can't call it;
-- - it counts the entries that count today (a withdrawn one doesn't) and hands over the landing
--   page's first picture with its alt text, naming the file only once the picture is approved
--   (GAPS-12a);
-- - the fifteen how-to guides and the rights page are live help pages in English and Romanian,
--   each passing the same checks a page published from Staff › Website passes (field lengths and
--   links to pages that exist), with Romanian ș and ț (comma below), never ş or ţ.
-- Personas: admin (…09), adult_writer (…01, Romania), teen_17 (…02).
-- Test data: one contest on a contest landing page, with its rules help page; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated;

/* ---------- 1. The open contests ---------- */

-- An admin sets up a complete contest for adults in Romania, open since yesterday: the rules page
-- in both languages, the live landing page linking to it, then the contest itself.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('page', public.admin_create_landing_page('hub-concurs', 'contest'));
insert into kept (label, id) values ('contest', public.admin_create_contest('hub-concurs'));
select public.admin_publish_cms_version(public.admin_save_cms_draft('help_page', 'regulament-hub', 'RO', language_code,
  jsonb_build_object('title', 'Rules', 'section', 'Contests', 'body', 'The rules.', 'isLegal', false),
  public.romania_today()))
from (values ('ro'), ('en')) as languages (language_code);
select public.admin_publish_landing_page(public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul", "intro": ""}, "en": {"title": "The contest", "intro": ""}}'::jsonb,
    jsonb_build_object('id', 'd', 'kind', 'key_dates', 'ro', '{"heading": "Date", "note": ""}'::jsonb,
      'en', '{"heading": "Dates", "note": ""}'::jsonb, 'dates', jsonb_build_object(
        'entries_open', public.romania_today() - 1, 'entries_close', public.romania_today() + 10,
        'results', public.romania_today() + 20)),
    '{"id": "r", "kind": "rules", "ro": {"heading": "Regulament", "body": "", "link_label": "Citește regulamentul"},
      "en": {"heading": "Rules", "body": "", "link_label": "Read the rules"}, "link": "/help/regulament-hub"}'::jsonb)),
  public.romania_today(), null));
select public.admin_save_contest((select id from kept where label = 'contest'), jsonb_build_object(
  'name_ro', 'Concursul de iarnă', 'name_en', 'The winter contest',
  'entries_open_on', public.romania_today() - 1, 'entries_close_on', public.romania_today() + 10,
  'results_on', public.romania_today() + 20,
  'age_groups', '["18_plus"]'::jsonb, 'market_codes', '["RO"]'::jsonb, 'language_codes', '["ro"]'::jsonb,
  'what_counts_ro', 'O povestire', 'what_counts_en', 'A short story', 'word_limit', 5000,
  'prize_ro', 'O carte', 'prize_en', 'A book', 'prize_delivered_by', 'The organiser',
  'judges', 'The editorial team', 'rules_page_key', 'regulament-hub'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.writers_hub_contests() where page_slug = 'hub-concurs'), 0::bigint,
  'a contest that isn''t open yet isn''t on the hub');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_open_contest((select id from kept where label = 'contest'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select results_eq(
  $$ select name_en, page_slug, entries_close_on, word_limit from public.writers_hub_contests()
     where contest_id = (select id from kept where label = 'contest') $$,
  $$ values ('The winter contest', 'hub-concurs', public.romania_today() + 10, 5000) $$,
  'an adult writer in Romania sees the open contest with its landing page address');

-- GAPS-12a: the entry count and the cover picture.
select is((select entry_count from public.writers_hub_contests() where page_slug = 'hub-concurs'), 0,
  'a contest nobody entered counts no entries');
select is((select cover from public.writers_hub_contests() where page_slug = 'hub-concurs'), '{}'::jsonb,
  'a landing page with no picture gives no cover');
reset role;
insert into public.contest_entries (user_id, contest_id, story_id)
values ('00000000-0000-4000-8000-000000000001', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select entry_count from public.writers_hub_contests() where page_slug = 'hub-concurs'), 1,
  'an entry that counts is counted');
reset role;
update public.contest_entries set status = 'withdrawn', withdrawn_at = now()
where contest_id = (select id from kept where label = 'contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select entry_count from public.writers_hub_contests() where page_slug = 'hub-concurs'), 0,
  'a withdrawn entry is not');

-- An admin uploads a picture for the page (uploads are behind a flag); it sits in the hero of
-- the live version.
reset role;
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into storage.objects (bucket_id, name, owner_id)
select 'landing-pictures', id::text || '/11111111-1111-4111-8111-111111111111.png', '00000000-0000-4000-8000-000000000009'
from kept where label = 'page';
insert into kept (label, id)
select 'picture', public.register_landing_picture(id::text || '/11111111-1111-4111-8111-111111111111.png') from kept where label = 'page';
reset role;
update public.landing_page_versions
set content = jsonb_set(content, '{blocks,0}', (content #> '{blocks,0}')
  || jsonb_build_object('picture_id', (select id from kept where label = 'picture'))
  || '{"ro": {"title": "Concursul", "intro": "", "alt": "O fereastră ninsă"}, "en": {"title": "The contest", "intro": "", "alt": "A snowy window"}}'::jsonb)
where page_id = (select id from kept where label = 'page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select cover -> (select id::text from kept where label = 'picture') ->> 'path'
           from public.writers_hub_contests() where page_slug = 'hub-concurs'), null,
  'a picture still being checked is named without its file');
reset role;
update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'picture');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select cover -> (select id::text from kept where label = 'picture') ->> 'state'
           from public.writers_hub_contests() where page_slug = 'hub-concurs'), 'visible',
  'an approved picture is the contest''s cover');
select results_eq(
  $$ select cover_alt_ro, cover_alt_en from public.writers_hub_contests() where page_slug = 'hub-concurs' $$,
  $$ values ('O fereastră ninsă', 'A snowy window') $$, 'with the alt text the admin wrote, in both languages');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*) from public.writers_hub_contests() where page_slug = 'hub-concurs'), 0::bigint,
  'a 17-year-old doesn''t see a contest for adults');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_contest((select id from kept where label = 'contest'),
  jsonb_build_object('entries_close_on', public.romania_today() - 1, 'entries_open_on', public.romania_today() - 5));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.writers_hub_contests() where page_slug = 'hub-concurs'), 0::bigint,
  'a contest whose entries closed yesterday leaves the hub');

reset role;
set local role anon;
select throws_ok($$ select * from public.writers_hub_contests() $$, '42501', null,
  'a visitor who isn''t signed in can''t call it');
reset role;

/* ---------- 2. The how-to guides and the rights page ---------- */

create temporary table guide_keys (entry_key text primary key) on commit drop;
insert into guide_keys values
  ('how-to-start-a-story'), ('how-to-schedule-chapters'), ('how-to-covers-and-pictures'),
  ('how-to-ratings-and-labels'), ('how-to-report-something'), ('how-to-block-someone'),
  ('how-to-follow-writers'), ('how-to-comments-and-reactions'), ('how-to-forums-and-spaces'),
  ('how-to-messages'), ('how-to-class-space'), ('how-to-reading-settings'), ('how-to-story-atlas'),
  ('how-to-download-data'), ('how-to-delete-account');

select is(
  (select count(*) from public.cms_versions as versions join guide_keys using (entry_key)
   where versions.content_kind = 'help_page' and versions.market_code = 'RO' and versions.status = 'published'),
  30::bigint, 'each of the fifteen guides is published in English and Romanian');
select is(
  (select count(distinct content ->> 'section') from public.cms_versions as versions join guide_keys using (entry_key)
   where versions.content_kind = 'help_page' and versions.language_code = 'en'),
  1::bigint, 'the guides share one section, so the Resources page and the Help centre group them');
select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and entry_key = 'writers-rights' and status = 'published'),
  2::bigint, 'the rights page is published in English and Romanian');
select is(
  (select count(*) from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.market_code = 'RO'
     and (versions.entry_key like 'how-to-%' or versions.entry_key = 'writers-rights')
     and cardinality(public.cms_content_problems(versions)) > 0),
  0::bigint, 'every guide passes the checks a page published from Staff › Website passes');
select is(
  (select count(*) from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.language_code = 'ro'
     and (versions.entry_key like 'how-to-%' or versions.entry_key = 'writers-rights')
     and versions.content::text ~ '[şţŞŢ]'),
  0::bigint, 'the Romanian guides use ș and ț with a comma below, never a cedilla');
select ok(
  (select bool_and(versions.content::text ~ '[șțăîâ]') from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.language_code = 'ro'
     and (versions.entry_key like 'how-to-%' or versions.entry_key = 'writers-rights')),
  'every Romanian guide is written in Romanian, with its diacritics');
select is(
  (select count(*) from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.language_code = 'en'
     and versions.entry_key like 'how-to-%' and versions.content ->> 'body' !~ '\n1\. '),
  0::bigint, 'every guide has numbered steps');

select * from finish();
rollback;
