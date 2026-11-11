-- Database tests for LOCALISE-1: one website page per entry, translated per language, with a
-- country's own wording only where needed (Robert, 11 Nov 2026).
-- What it proves:
-- - the shared page (no country) can be written in every interface language, and in no other;
-- - a translation may leave fields empty once the English page exists, and visitors then see the
--   English text in those fields; the English page itself must be complete;
-- - a visitor gets their language before English and their country's wording before the shared page;
-- - a translation that is taken down shows the English page again;
-- - a shared notice needs English only and shows English where a language has no text;
-- - the helper that fills empty fields is internal (nobody outside the database's own functions
--   can call it), and a visitor can't write a draft.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
-- Publishes the one draft of an entry.
create function pg_temp.publish_draft(wanted_key text) returns date language sql as $$
  select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = wanted_key and status = 'draft'));
$$;
grant execute on all functions in schema pg_temp to authenticated;

/* ---------- The filling helper ---------- */

select is(
  public.cms_fill_empty(
    '{"title": "Titel", "body": "", "points": ["Ett", ""], "search": {"title": " "}}'::jsonb,
    '{"title": "Title", "body": "Body", "points": ["One", "Two", "Three"], "search": {"title": "Search", "hidden": false}, "section": "Basics"}'::jsonb),
  '{"title": "Titel", "body": "Body", "points": ["Ett", "Two", "Three"], "search": {"title": "Search", "hidden": false}, "section": "Basics"}'::jsonb,
  'empty and missing fields, list items included, come from the English page; written ones stay');
select is(public.cms_fill_empty('{"title": "Titel"}'::jsonb, null), '{"title": "Titel"}'::jsonb,
  'with no English page the translation stays as it is');
select ok(not has_function_privilege('anon', 'public.cms_fill_empty(jsonb, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.cms_fill_empty(jsonb, jsonb)', 'execute'),
  'denied: the filling helper is internal');

/* ---------- Where a page can be written ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'sv',
    '{"title": "Hjälp", "section": "", "body": "", "isLegal": false}'::jsonb) $$,
  'allowed: an admin writes the shared page in Swedish, an interface language');
select is(pg_temp.hint_of($$ select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'de', '{}'::jsonb) $$),
  'unknown_language', 'a language the interface doesn''t have is refused for the shared page');
select is(pg_temp.hint_of($$ select public.admin_save_cms_draft('help_page', 'one-page-test', 'SE', 'ro', '{}'::jsonb) $$),
  'unknown_language', 'a country''s own wording takes that country''s languages only');
select is(pg_temp.hint_of($$ select public.admin_save_cms_draft('help_page', 'one-page-test', 'XX', 'en', '{}'::jsonb) $$),
  'unknown_market', 'an unknown country is refused');

/* ---------- Empty fields ---------- */

select matches(pg_temp.hint_of($$ select pg_temp.publish_draft('one-page-test') $$), 'section:empty',
  'a translation can''t go live with empty fields while there is no English page');
select is((select count(*)::integer from public.cms_versions where entry_key = 'one-page-test' and status = 'draft'), 1,
  'and it stays a draft');
-- The English page, incomplete: refused. Complete: live.
select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'en',
  '{"title": "Help", "section": "", "body": "The English body.", "isLegal": false}'::jsonb);
select is(pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'one-page-test' and status = 'draft' and language_code = 'en')) $$),
  'section:empty', 'the English page must be complete');
select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'en',
  '{"title": "Help", "section": "Basics", "body": "The English body.", "isLegal": false}'::jsonb);
select public.admin_publish_cms_version((select id from public.cms_versions
  where entry_key = 'one-page-test' and status = 'draft' and language_code = 'en'));
select lives_ok($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'one-page-test' and status = 'draft' and language_code = 'sv')) $$,
  'once the English page exists, a translation goes live with empty fields');
select is(pg_temp.hint_of($$ select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'sv',
    ('{"title": "' || repeat('a', 81) || '", "section": "", "body": "", "isLegal": false}')::jsonb) is null
    or pg_temp.publish_draft('one-page-test') is null $$),
  'title:too_long', 'a translation''s other checks still hold');
reset role;
delete from public.cms_versions where entry_key = 'one-page-test' and status = 'draft';

/* ---------- What a visitor reads ---------- */

set local role anon;
select is(
  (select language_code || ':' || (content ->> 'title') || ':' || (content ->> 'section') || ':' || (content ->> 'body')
   from public.website_content('help_page', 'SE', 'sv') where entry_key = 'one-page-test'),
  'sv:Hjälp:Basics:The English body.',
  'a visitor reads the translation, with its empty fields in English');
select is((select language_code from public.website_content('help_page', 'SE', 'da') where entry_key = 'one-page-test'),
  'en', 'a language with no translation reads the English page');
select throws_ok($$ select public.admin_save_cms_draft('help_page', 'one-page-test', '', 'sv', '{}'::jsonb) $$,
  '42501', null, 'denied: a visitor can''t write a draft');
reset role;

-- Sweden's own wording, in Swedish: Swedish visitors get it; everyone else keeps the shared page.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('help_page', 'one-page-test', 'SE', 'sv',
  '{"title": "Hjälp i Sverige", "section": "Grunder", "body": "Svensk text.", "isLegal": false}'::jsonb);
select public.admin_publish_cms_version((select id from public.cms_versions
  where entry_key = 'one-page-test' and status = 'draft'));
select is(
  (select array_agg(coalesce(market_code, 'shared') || ':' || (content ->> 'title') order by place)
   from (values (1, 'SE'), (2, 'DK')) as visitors (place, country)
   cross join lateral public.website_content('help_page', visitors.country, 'sv') as page
   where page.entry_key = 'one-page-test'),
  array['SE:Hjälp i Sverige', 'shared:Hjälp'],
  'a country''s own wording shows there, and the shared page everywhere else');

-- The Swedish translation taken down: English again (outside Sweden).
select public.admin_remove_cms_entry('help_page', 'one-page-test', '', 'sv');
select is((select language_code || ':' || (content ->> 'title') from public.website_content('help_page', 'DK', 'sv')
    where entry_key = 'one-page-test'),
  'en:Help', 'a translation that was taken down shows the English page again');

/* ---------- A shared notice ---------- */

select public.admin_save_cms_draft('notice', 'one-page-notice', '', '',
  '{"texts": {"ro": "Doar în română."}, "noticeType": "news", "showOn": "all"}'::jsonb);
select is(pg_temp.hint_of($$ select pg_temp.publish_draft('one-page-notice') $$), 'texts.en:empty',
  'a shared notice needs its English text');
select public.admin_save_cms_draft('notice', 'one-page-notice', '', '',
  '{"texts": {"en": "For everyone.", "ro": "Pentru toată lumea."}, "noticeType": "news", "showOn": "all"}'::jsonb);
select pg_temp.publish_draft('one-page-notice');
select is(
  (select array_agg(language_code || ':' || (content -> 'texts' ->> language_code) order by place)
   from (values (1, 'RO', 'ro'), (2, 'SE', 'sv')) as visitors (place, country, language)
   cross join lateral public.website_content('notice', visitors.country, visitors.language) as notice
   where notice.entry_key = 'one-page-notice'),
  array['ro:Pentru toată lumea.', 'en:For everyone.'],
  'a shared notice shows in every country, in English where the language has no text');
reset role;

select * from finish();
rollback;
