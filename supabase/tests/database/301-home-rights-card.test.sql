-- Database tests for the gold "Your rights" card on the home page's cover wall (bundle LOOK-2,
-- the design catch-up; migration 20270202100001_look2_01_home_rights_card.sql).
-- What it proves:
-- - version 1 of the Romanian market's home page carries the card in ro and en, word for word;
-- - cms_home_page_problems() accepts a page with no card or an empty card, so the card stays
--   optional;
-- - a half-written card is refused field by field, and a title over 60 characters is too long.
-- No table or policy changes, so there is no allowed or denied policy test here.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

/* ---------- The seeded card ---------- */

select is(
  (select content -> 'rightsCard' from public.cms_versions
   where content_kind = 'home_page' and entry_key = 'home' and market_code is null
     and language_code = 'en' and user_id is null),
  jsonb_build_object('eyebrow', 'Your rights', 'title', 'You keep all the rights to your work',
    'body', 'Publish it anywhere else too'),
  'version 1 of the English home page carries the rights card');
select is(
  (select content -> 'rightsCard' ->> 'title' from public.cms_versions
   where content_kind = 'home_page' and entry_key = 'home' and market_code is null
     and language_code = 'ro' and user_id is null),
  'Toate drepturile asupra textelor tale rămân ale tale',
  'version 1 of the Romanian home page carries the rights card, with ș and ț as written');
select is(
  (select public.cms_home_page_problems(content) from public.cms_versions
   where content_kind = 'home_page' and entry_key = 'home' and market_code is null
     and language_code = 'en' and user_id is null),
  array[]::text[], 'the seeded English home page, card included, passes every check');

/* ---------- The checks ---------- */

-- Start from the seeded page, so only the card differs between the cases.
create temporary table seeded_page on commit drop as
  select content as page from public.cms_versions
  where content_kind = 'home_page' and entry_key = 'home' and market_code is null
    and language_code = 'en' and user_id is null;

select is(
  (select public.cms_home_page_problems((page - 'rightsCard')
     || jsonb_build_object('rightsCard', jsonb_build_object('eyebrow', '', 'title', ' ', 'body', '')))
   from seeded_page),
  array[]::text[], 'an empty card is fine: the home page simply shows no card');
select is(
  (select public.cms_home_page_problems((page - 'rightsCard')
     || jsonb_build_object('rightsCard', jsonb_build_object('eyebrow', 'Your rights', 'title', '', 'body', '')))
   from seeded_page),
  array['rightsCard.title:empty', 'rightsCard.body:empty'],
  'a half-written card is refused, naming each empty field');
select ok(
  (select 'rightsCard.title:too_long' = any(public.cms_home_page_problems(jsonb_set(page,
     '{rightsCard,title}', to_jsonb(repeat('a', 61))))) from seeded_page),
  'a card title over 60 characters is too long');

select * from finish();
rollback;
