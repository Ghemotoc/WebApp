-- Database tests for ad-network ads that are never personalised (story S1-E12-04; bundle
-- SPONSORS-d; ADR 0014).
-- What it proves:
-- - the network is off by default and while its publisher ID or ad unit is missing or malformed;
-- - once on, it fills only a wide banner, once per page, labelled "Ad", after a matching sponsor
--   and our landing pages and before our other house ads (S1-E12-05's fill order);
-- - it never fills a card, a side box or a portrait, nor anything in a class space (Q70);
-- - a visitor and a signed-in reader get the same answer: nothing about the reader is read.
-- Personas: teen_17 (…02).
-- Test data: settings changed here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
-- The labels of a page's ads, in slot order, joined with " · ".
create function pg_temp.labels(page text, context jsonb default '{}') returns text language sql as $$
  select string_agg(coalesce(slot #>> '{ad,label}', '-'), ' · ' order by ordinality)
  from jsonb_array_elements(public.page_ads(page, context)) with ordinality as slots (slot, ordinality);
$$;
grant execute on function pg_temp.labels(text, jsonb) to anon, authenticated;
create temporary table kept (label text primary key, words jsonb) on commit drop;
grant all on kept to authenticated, anon;

-- No live landing page yet, so the test knows which house ad comes first.
update public.landing_pages set archived_at = now() where archived_at is null;

-- Step 1: off by default, and while the account isn't set up.
select pg_temp.as_visitor();
select is(pg_temp.labels('discover'), 'house · house', 'the network is off by default: Discover shows our own ads');
reset role;
update public.feature_flags set is_enabled = true where key = 'ad_network';
select pg_temp.as_visitor();
select is(pg_temp.labels('discover'), 'house · house', 'switched on without a publisher ID, it still shows nothing from the network');
reset role;
update public.settings set value = '"pub-123"'::jsonb where key = 'ad_network_publisher_id';
update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';
select pg_temp.as_visitor();
select is(pg_temp.labels('discover'), 'house · house', 'a malformed publisher ID keeps it off');
reset role;

-- Step 2: set up properly.
update public.settings set value = '"ca-pub-1234567890123456"'::jsonb where key = 'ad_network_publisher_id';
select pg_temp.as_visitor();
select is(pg_temp.labels('discover'), 'ad · house',
  'Discover''s wide banner shows the network''s ad, labelled Ad, and its card stays ours');
select is((public.page_ads('discover') #> '{0,ad}'::text[]) - array['page_slug', 'title_ro', 'title_en'],
  '{"key": "network", "kind": "network", "label": "ad", "slot_id": "1234567890", "publisher_id": "ca-pub-1234567890123456"}'::jsonb,
  'the network ad carries only the account and the ad unit, nothing about the reader');
select is(pg_temp.labels('search'), 'ad · house', 'Search''s wide banner takes it and its portrait stays ours: never a portrait, card or side box');
reset role;

-- Step 3: never in a story shared only with a class, and the same for a signed-in teenager.
with shared as (
  update public.stories set class_only = true where id = '00000000-0000-4000-9000-000000000002' returning slug
)
insert into kept (label, words) select 'class_story', to_jsonb(shared.slug) from shared;
select pg_temp.as_visitor();
insert into kept (label, words) values ('visitor_search', public.page_ads('search'));
select is(public.page_ads('story', jsonb_build_object('story_slug', (select words #>> '{}' from kept where label = 'class_story'))),
  '[]'::jsonb, 'a story shared only with a class shows no network ad, nor any other');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.page_ads('search'), (select words from kept where label = 'visitor_search'),
  'a signed-in teenager gets exactly what a visitor gets');
reset role;

-- Step 4: our landing pages come before the network.
with page as (
  insert into public.landing_pages (slug, page_type) values ('retea-test-274', 'information') returning id
)
insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
  '{"id": "h", "kind": "hero", "ro": {"title": "Atelier", "intro": ""}, "en": {"title": "Workshop", "intro": ""}}'::jsonb)),
  public.romania_today(), now()
from page;
select pg_temp.as_visitor();
select is(public.page_ads('story') #>> '{0,ad,kind}', 'landing', 'a live landing page of ours comes before the network');
reset role;

select * from finish();
rollback;
