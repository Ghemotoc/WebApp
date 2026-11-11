-- Database test: an easier page builder (story S1-E11-34, bundle CMS-2b).
-- Covers: moderators build landing pages through the new landing_pages area (criterion 4), and a
-- custom role can hold it; the home page stays with the website area; the five new blocks are
-- checked like the others (criterion 2), with a call to action's link only a site page or https
-- (criterion 3). The new policies' denied side (support) is in 261 and 262.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid, value jsonb) on commit drop;
grant all on kept to authenticated;

-- A page with a hero and every new block, valid in both languages.
insert into kept (label, value) values ('page', $json${"theme": "sky", "blocks": [
  {"id": "h", "kind": "hero", "ro": {"title": "Scrie cu noi", "intro": ""}, "en": {"title": "Write with us", "intro": ""}},
  {"id": "c", "kind": "cards", "ro": {"heading": "De ce", "entries": [{"title": "Unu", "body": "Primul"}, {"title": "Doi", "body": "Al doilea"}]},
   "en": {"heading": "Why", "entries": [{"title": "One", "body": "First"}, {"title": "Two", "body": "Second"}]}},
  {"id": "s", "kind": "steps", "ro": {"heading": "Pași", "entries": [{"title": "Scrie", "body": "Un capitol"}, {"title": "Trimite", "body": "Până vineri"}]},
   "en": {"heading": "Steps", "entries": [{"title": "Write", "body": "A chapter"}, {"title": "Send", "body": "By Friday"}]}},
  {"id": "q", "kind": "quote", "ro": {"quote": "Am scris în fiecare zi.", "source": "Ana"}, "en": {"quote": "I wrote every day.", "source": "Ana"}},
  {"id": "a", "kind": "call_to_action", "ro": {"heading": "Începe", "body": "", "button_label": "Scrie"},
   "en": {"heading": "Start", "body": "", "button_label": "Write"}, "link": "/write"}]}$json$);

-- 4. A moderator builds landing pages now; support still can't (261).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(public.staff_may('landing_pages', 'act'), 'a moderator holds the landing pages area');
insert into kept (label, id) select 'made', public.admin_create_landing_page('builder-test', 'campaign');
select ok((select id from kept where label = 'made') is not null, 'a moderator creates a landing page');
select ok(public.admin_save_landing_page_draft((select id from kept where label = 'made'),
  (select value from kept where label = 'page')) is not null, 'a moderator saves a draft');
select is((select count(*)::int from public.landing_pages where slug = 'builder-test'), 1,
  'allowed: landing_pages_select_staff shows a moderator the pages');
select is((select count(*)::int from public.landing_page_versions
           where page_id = (select id from kept where label = 'made')), 1,
  'allowed: landing_page_versions_select_staff shows a moderator the drafts');
select ok(not public.staff_may('website_cms', 'act'), 'the home page, notices and help stay out of a moderator''s reach');

-- 2. The new blocks pass when they are complete.
reset role;
select is(public.landing_page_problems('campaign', (select value from kept where label = 'page')), '{}'::text[],
  'a page with cards, steps, a quote and a call to action has no problems');

-- 3. A call to action's link is a page on the site or an https address.
select ok('blocks.4.link:bad_link' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,4,link}', '"javascript:alert(1)"'))),
  'a script link is refused');
select ok('blocks.4.link:bad_link' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,4,link}', '"http://example.com"'))),
  'a plain http link is refused');
select ok('blocks.4.link:bad_link' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,4,link}', '"//3232235777"'))),
  'a link starting with // is refused, since a browser reads it as another site');
select ok('blocks.4.link:empty' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,4,link}', '""'))),
  'a call to action needs a link');

-- 2. Cards and steps: how many, the same in both languages, each filled in.
select ok('blocks.1.entries:wrong_number' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,1,ro,entries}', '[{"title": "Unu", "body": "x"}]'))),
  'one card is too few, and the languages must match');
select ok('blocks.1.entries:wrong_number' = any(public.landing_page_problems('campaign',
  jsonb_set(jsonb_set((select value from kept where label = 'page'), '{blocks,1,ro,entries}',
    (select jsonb_agg(jsonb_build_object('title', 'T', 'body', 'B')) from generate_series(1, 5))),
    '{blocks,1,en,entries}', (select jsonb_agg(jsonb_build_object('title', 'T', 'body', 'B')) from generate_series(1, 5))))),
  'five cards are too many');
select ok('blocks.2.en.entries.0:empty' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,2,en,entries,0,title}', to_jsonb(repeat('x', 81))))),
  'a step title over 80 characters is refused');
select ok('blocks.3.ro.quote:empty' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,3,ro,quote}', '""'))),
  'a quote needs its words');

-- Picture and text needs its picture; a quote can't carry one.
select ok('blocks.1.picture:empty' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,1}',
    '{"id": "p", "kind": "picture_text", "ro": {"heading": "Aici", "body": "Text"}, "en": {"heading": "Here", "body": "Words"}}'))),
  'picture and text without a picture is refused');
select ok('blocks.3.picture:not_allowed' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,3,picture_id}', '"00000000-0000-4000-8000-000000000001"'))),
  'a quote can''t carry a picture');

-- Break test (CMS-2b): a broken draft gives "fix this" problems, never a database error, and a
-- page too big to be typed is refused on save.
select ok(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,1,en,entries}', '"not a list"'))
  @> array['blocks.1.entries:wrong_number'], 'cards that are not a list are a problem, not an error');
select ok('blocks.3.ro.quote:invalid' = any(public.landing_page_problems('campaign',
  jsonb_set((select value from kept where label = 'page'), '{blocks,3,ro,quote}', '{"x": 1}'))),
  'a quote that is not text is invalid');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$select public.admin_save_landing_page_draft(%L, jsonb_build_object('blocks', repeat('x', 600000)))$$,
  (select id from kept where label = 'made')), '23514', 'This page is too big to save.', 'a page too big to have been typed is refused');
reset role;

select * from finish();
rollback;
