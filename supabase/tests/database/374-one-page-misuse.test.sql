-- Break test for LOCALISE-1 (one website page per entry, translated per language): what a
-- visitor, a member, a moderator and an odd address must not be able to do.
-- What it proves:
-- - a visitor, a member and a moderator can't write, publish or take down a shared page;
-- - nobody reads a draft or a scheduled translation through website_content();
-- - an address made of nonsense (an unknown country, a language that is SQL, nothing at all)
--   reads the shared English page and never raises;
-- - the filling helper survives pages of the wrong shape (a list where text was, a number, null);
-- - a translation can't smuggle a field the English page lacks past the checks that apply to it
--   (a text over its limit is still refused when the rest is empty);
-- - a country's own wording can't lean on English: it must be complete;
-- - website_places() tells search engines about open languages of open markets only, and a
--   visitor may call it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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
grant execute on all functions in schema pg_temp to authenticated, anon;

/* ---------- Who may write ---------- */

set local role anon;
select throws_ok($$ select public.admin_save_cms_draft('help_page', 'misuse-test', '', 'sv', '{"title": "x"}'::jsonb) $$,
  '42501', null, 'denied: a visitor can''t write a shared page');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_save_cms_draft('help_page', 'misuse-test', '', 'sv', '{"title": "x"}'::jsonb) $$,
  '42501', null, 'denied: a member can''t write a shared page');
select throws_ok($$ select public.admin_remove_cms_entry('help_page', 'getting-started', '', 'en') $$,
  '42501', null, 'denied: a member can''t take a shared page down');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_cms_draft('help_page', 'misuse-test', '', 'sv', '{"title": "x"}'::jsonb) $$,
  '42501', null, 'denied: a moderator can''t write a shared page (admin and owner only, 17 Oct 2026)');
reset role;

/* ---------- Drafts and scheduled translations stay unseen ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('help_page', 'getting-started', '', 'sv',
  '{"title": "Utkast", "section": "", "body": "", "isLegal": false}'::jsonb);
reset role;
set local role anon;
select is((select language_code from public.website_content('help_page', 'SE', 'sv') where entry_key = 'getting-started'),
  'en', 'a draft translation is not shown: the visitor reads English');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('help_page', 'getting-started', '', 'sv',
  '{"title": "Senare", "section": "", "body": "", "isLegal": false}'::jsonb, public.romania_today() + 1);
select public.admin_publish_cms_version((select id from public.cms_versions
  where entry_key = 'getting-started' and language_code = 'sv' and status = 'draft'));
reset role;
set local role anon;
select is((select language_code from public.website_content('help_page', 'SE', 'sv') where entry_key = 'getting-started'),
  'en', 'a translation scheduled for tomorrow is not shown today');

/* ---------- Nonsense in the address ---------- */

select lives_ok($$ select * from public.website_content('help_page', 'ZZ', $q$'; drop table public.cms_versions; --$q$) $$,
  'an unknown country and a language that is SQL raise nothing');
select is((select language_code || ':' || coalesce(market_code, 'shared') from public.website_content('help_page', null, null)
    where entry_key = 'getting-started'),
  'en:shared', 'no country and no language at all read the shared English page');

/* ---------- Website places ---------- */

select lives_ok($$ select * from public.website_places() $$, 'allowed: a visitor reads which places exist');
select is((select listed_languages from public.website_places() where country_code = 'SE'), '{}'::text[],
  'a market that is not open has no language listed for search engines');
select is((select listed_languages from public.website_places() where country_code = 'RO'), array['ro', 'en'],
  'an open market lists its open languages');
reset role;
-- is_open follows the market's status (a trigger keeps the two the same).
update public.markets set status = 'closed' where country_code = 'RO';
select is((select listed_languages from public.website_places() where country_code = 'RO'), '{}'::text[],
  'once a market closes, none of its languages is listed');

/* ---------- Pages of the wrong shape ---------- */

select lives_ok($$ select public.cms_fill_empty('5'::jsonb, '"text"'::jsonb),
    public.cms_fill_empty('null'::jsonb, '{"a": 1}'::jsonb),
    public.cms_fill_empty('{"a": {"b": ""}}'::jsonb, '{"a": "text"}'::jsonb) $$,
  'the filling helper raises nothing on a number, null or a field whose shape differs');
select is(public.cms_fill_empty('["a"]'::jsonb, '{"a": "b"}'::jsonb), '["a"]'::jsonb,
  'a list where the English page has fields stays as written');

/* ---------- The checks a translation still meets ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('help_page', 'reporting-and-safety', '', 'sv',
  jsonb_build_object('title', repeat('å', 500), 'section', '', 'body', '', 'isLegal', false));
select ok(
  pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'reporting-and-safety' and language_code = 'sv' and status = 'draft')) $$) like '%title:too_long%',
  'a translation may leave fields empty, but a text over its limit is still refused');
select public.admin_save_cms_draft('help_page', 'reporting-and-safety', 'SE', 'sv',
  '{"title": "Bara en titel", "section": "", "body": "", "isLegal": false}'::jsonb);
select ok(
  pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'reporting-and-safety' and market_code = 'SE' and status = 'draft')) $$) like '%body:empty%',
  'a country''s own wording can''t lean on English: it must be complete');
reset role;

select * from finish();
rollback;
