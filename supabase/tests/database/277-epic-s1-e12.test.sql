-- Epic check for S1-E12, banners and sponsor slots (story S1-E12-QA; bundle SPONSORS).
-- It adds no feature: it walks the epic's main journeys through the database, where its stories
-- meet, with the seed personas the story names.
-- Journey 1 (S1-E12-02 × S1-E12-05 × S1-E12-01 × S1-E12-03): an approved banner is booked into
--   Discover's wide slot → teen_17, kid_14_ok, kid_14_waiting and a visitor all get the same
--   Sponsored ad (no personalising) → a view and a click count → the admin's report shows them.
-- Journey 2 (S1-E12-04 × S1-E12-05 × S1-E3-06): with the network on, a booked slot still goes to
--   its sponsor; a story with sexual content ticked shows our own ad instead of the network;
--   a class space and a class-only story have no slot at all (Q70).
-- Who (architecture 1.8.3): a moderator can't book or read a report; teen_17 can't book or see
--   bookings (ad_bookings_select_sponsor_staff, denied); the admin can (allowed).
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
-- Discover's wide slot as the signed-in persona (or a visitor) sees it: label and key.
create function pg_temp.discover_wide() returns text language sql as $$
  select slot #>> '{ad,label}' || ' ' || (slot #>> '{ad,key}')
  from jsonb_array_elements(public.page_ads('discover')) as slot
  where slot ->> 'slot_key' = 'discover_wide';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
create temporary table kept (label text primary key, id uuid);
grant all on kept to anon, authenticated;

-- No live landing page, so the order below is the server's own; the network is off for now.
update public.landing_pages set archived_at = now() where archived_at is null;
update public.feature_flags set is_enabled = false where key = 'ad_network';

/* ---------- 1. A sponsor from approval to report ---------- */

-- A sponsor and one Discover banner that has passed review (S1-E12-02), running for a month.
insert into public.sponsors (name) values ('Epic Twelve');
insert into public.sponsor_campaigns (sponsor_id, name, placement, starts_on, ends_on, state,
  text_ro, text_en, link_url, review_checks, reviewed_at)
select id, 'Epic banner', 'discover_banner', public.romania_today() - 1, public.romania_today() + 30,
  'approved', 'Citește cu noi.', 'Read with us.', 'https://epic.example/', public.sponsor_review_checks(), now()
from public.sponsors where name = 'Epic Twelve';
insert into kept (label, id) select 'campaign', id from public.sponsor_campaigns where name = 'Epic banner';

-- The admin books it into Discover's wide slot for this week (S1-E12-05).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ insert into kept (label, id) values ('booking', public.admin_book_ad_slot(
    (select id from kept where label = 'campaign'),
    jsonb_build_object('slot_key', 'discover_wide', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 6))) $$,
  'the admin books the approved banner into Discover''s wide slot (S1-E12-02 × S1-E12-05)');
select ok((select count(*) from public.ad_bookings) >= 1, 'allowed: ad_bookings_select_sponsor_staff (the admin sees the booking)');

-- Everyone gets the same ad: nothing about the reader picks it (S1-E12-01, no tracking).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.discover_wide(), 'sponsored campaign:' || (select id from kept where label = 'campaign'),
  'teen_17 sees the booked sponsor on Discover, labelled sponsored');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.discover_wide(), 'sponsored campaign:' || (select id from kept where label = 'campaign'),
  'and so does kid_14_ok, because every campaign was checked as suitable for under-18s');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is(pg_temp.discover_wide(), 'sponsored campaign:' || (select id from kept where label = 'campaign'),
  'and kid_14_waiting, who can read but not yet write');
select pg_temp.as_visitor();
select is(pg_temp.discover_wide(), 'sponsored campaign:' || (select id from kept where label = 'campaign'),
  'and a signed-out visitor');

-- The visitor's view and click count, with no cookie or user ID (S1-E12-03).
select public.record_sponsor_event('campaign:' || (select id from kept where label = 'campaign'), 'impression');
select public.record_sponsor_event('campaign:' || (select id from kept where label = 'campaign'), 'click');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select report -> -1 from (select public.admin_sponsor_campaign_report((select id from kept where label = 'campaign')) as report) as answer),
  jsonb_build_object('day', public.romania_today(), 'impressions', 1, 'clicks', 1),
  'the admin''s report shows today''s view and click (S1-E12-05 × S1-E12-03)');

/* ---------- 2. The network, the booking and the story's rating ---------- */

reset role;
update public.feature_flags set is_enabled = true where key = 'ad_network';
update public.settings set value = '"ca-pub-1234567890123456"'::jsonb where key = 'ad_network_publisher_id';
update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';
select pg_temp.as_visitor();
select is(pg_temp.discover_wide(), 'sponsored campaign:' || (select id from kept where label = 'campaign'),
  'with the network on, the booked slot still goes to its sponsor (S1-E12-04 × S1-E12-05)');
select is(public.page_ads('story', '{"story_slug": "statia-meteo-seed01"}') #>> '{0,ad,label}', 'ad',
  'an All ages story''s page gets the network in its wide slot');
reset role;
update public.stories set rating = '18_plus', rating_reasons = '{sexual_content}' where slug = 'statia-meteo-seed01';
select pg_temp.as_visitor();
select is(public.page_ads('story', '{"story_slug": "statia-meteo-seed01"}') #>> '{0,ad,label}', 'house',
  'once it is 18+ with sexual content ticked, our own ad fills the slot instead (S1-E12-04 × S1-E3-06)');
reset role;
-- adult_writer's second seed story is shared only with a class; its address is kept for the visitor.
update public.stories set class_only = true where id = '00000000-0000-4000-9000-000000000002';
select set_config('epic.class_story', slug, true) from public.stories where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.as_visitor();
select is(public.page_ads('story', jsonb_build_object('story_slug', current_setting('epic.class_story'))), '[]'::jsonb,
  'a class-only story has no ad slot at all, network or sponsor (S1-E12-01, Q70)');

/* ---------- 3. Who may do what ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format('select public.admin_sponsor_campaign_report(%L)', (select id from kept where label = 'campaign')),
  '42501', null, 'a moderator can''t read a sponsor''s report');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok(format($$ select public.admin_book_ad_slot(%L, jsonb_build_object('slot_key', 'search_wide',
    'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 1)) $$, (select id from kept where label = 'campaign')),
  '42501', null, 'teen_17 can''t book a slot');
select is((select count(*)::integer from public.ad_bookings), 0,
  'denied: ad_bookings_select_sponsor_staff (teen_17 sees no bookings)');

select * from finish();
rollback;
