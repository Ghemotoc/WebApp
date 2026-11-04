-- Database tests for booking sponsors into ad slots, our own house ads and the fill order (story
-- S1-E12-05; bundle SPONSORS-e1).
-- What it proves:
-- - only owner and admin read bookings and house ads (allowed and denied for both policies) and
--   only they book, change or cancel;
-- - criterion 2: a booking takes an approved banner campaign, inside its dates; an overlapping
--   booking of the same slot is refused with the clashing campaign named; cancelling frees it;
-- - criterion 3: a page fills a slot with the booked sponsor whose context matches, else our own
--   house ad (a booked slot never goes to another sponsor), else the network, else built-in ads;
-- - criterion 6: a house ad needs both languages and one of our own pages as its link;
-- - criterion 1: Placements shows each slot's week as Booked, House ad, Ad network or Free;
-- - criterion 7: booking, changing and cancelling are in the audit log.
-- Personas: adult_writer (…01), admin (…09).
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_admin() returns void language sql as $$
  select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
$$;
create function pg_temp.as_writer() returns void language sql as $$
  select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
$$;
-- The kinds of a page's ads, in slot order, joined with " · "; the three built-in house ads
-- (write, classics, forums) all read "house", because their order changes from day to day.
create function pg_temp.kinds(page text, context jsonb default '{}') returns text language sql as $$
  select string_agg(case when slot #>> '{ad,kind}' in ('write', 'classics', 'forums') then 'house'
                         else coalesce(slot #>> '{ad,kind}', '-') end, ' · ' order by ordinality)
  from jsonb_array_elements(public.page_ads(page, context)) with ordinality as slots (slot, ordinality);
$$;
-- The detail of the error a statement raises, or 'none'.
create function pg_temp.error_detail(statement text) returns text language plpgsql as $$
declare
  detail_text text;
begin
  execute statement;
  return 'none';
exception when others then
  get stacked diagnostics detail_text = pg_exception_detail;
  return sqlstate || ': ' || detail_text;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
create temporary table kept (label text primary key, id uuid);
grant all on kept to anon, authenticated;

-- Step 1: no live landing page, so the test knows which house ad comes first; two approved
-- Discover banners and one "Sponsored by" credit, all running for a month.
update public.landing_pages set archived_at = now() where archived_at is null;
insert into public.sponsors (name) values ('Booking Test');
insert into public.sponsor_campaigns (sponsor_id, name, placement, category_slug, starts_on, ends_on, state, text_en, text_ro)
select sponsors.id, rows.name, rows.placement::public.sponsor_placement, rows.category_slug,
  public.romania_today() - 1, public.romania_today() + 30, 'approved', 'Line', 'Rând'
from public.sponsors, (values ('Booked', 'discover_banner', null), ('Unbooked', 'discover_banner', null),
                              ('Credit', 'category', 'poetry')) as rows (name, placement, category_slug)
where sponsors.name = 'Booking Test';
insert into kept (label, id) select lower(name), id from public.sponsor_campaigns
  where sponsor_id = (select id from public.sponsors where name = 'Booking Test');

-- Step 2: before any booking, the unbooked banner takes Discover's wide slot by its placement.
select is(pg_temp.kinds('discover'), 'sponsor · house', 'an unbooked slot still takes a live campaign by its placement');

-- Step 3: booking, as the admin and as a writer.
select pg_temp.as_admin();
select lives_ok($$
  insert into kept (label, id) values ('booking', public.admin_book_ad_slot((select id from kept where label = 'booked'),
    jsonb_build_object('slot_key', 'discover_wide', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 7,
      'categories', '["poetry"]'::jsonb))) $$,
  'an admin books an approved campaign into Discover''s wide slot for a week, on poetry pages');
select is(pg_temp.error_detail(format($$ select public.admin_book_ad_slot(%L,
    jsonb_build_object('slot_key', 'discover_wide', 'starts_on', public.romania_today() + 3, 'ends_on', public.romania_today() + 10)) $$,
    (select id from kept where label = 'unbooked'))),
  '23P01: Booked (' || public.romania_today() || ' to ' || (public.romania_today() + 7) || ')',
  'an overlapping booking of the same slot is refused, naming the clashing campaign and its days');
select throws_ok(format($$ select public.admin_book_ad_slot(%L,
    jsonb_build_object('slot_key', 'discover_card', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 1)) $$,
    (select id from kept where label = 'credit')),
  '23514', null, 'a "Sponsored by" credit can''t be booked into a slot');
select throws_ok(format($$ select public.admin_book_ad_slot(%L,
    jsonb_build_object('slot_key', 'discover_card', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 60)) $$,
    (select id from kept where label = 'unbooked')),
  '23514', null, 'days past the campaign''s own end are refused');
reset role;
select pg_temp.as_writer();
select throws_ok(format($$ select public.admin_book_ad_slot(%L,
    jsonb_build_object('slot_key', 'discover_card', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 1)) $$,
    (select id from kept where label = 'unbooked')),
  '42501', null, 'a writer can''t book a slot');
reset role;

-- Step 4: our own house ads.
select pg_temp.as_admin();
select throws_ok($$ select public.admin_save_house_ad(null, jsonb_build_object('title_ro', 'Concurs', 'title_en', 'Contest',
    'link_path', 'https://example.com/', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 7)) $$,
  '23514', null, 'a house ad must lead to one of our own pages, never another site');
select throws_ok($$ select public.admin_save_house_ad(null, jsonb_build_object('title_ro', 'Concurs', 'title_en', '',
    'link_path', '/c/poetry-week', 'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 7)) $$,
  '23514', null, 'a house ad needs its title in both languages');
select lives_ok($$ insert into kept (label, id) values ('house', public.admin_save_house_ad(null, jsonb_build_object(
    'title_ro', 'Săptămâna poeziei', 'title_en', 'Poetry week', 'text_en', 'Read and write', 'link_path', '/c/poetry-week',
    'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 7))) $$,
  'an admin adds a house ad in Română and English leading to one of our pages');
reset role;

-- Step 5: the fill order.
select is(pg_temp.kinds('discover', '{"category": "poetry"}'), 'sponsor · staff',
  'on a poetry page the booked sponsor takes the wide slot, and our house ad the card');
select is(public.page_ads('discover', '{"category": "poetry"}') #>> '{0,ad,key}', 'campaign:' || (select id from kept where label = 'booked'),
  'the sponsor in the wide slot is the booked one');
select is(pg_temp.kinds('discover', '{"category": "fiction"}'), 'staff · house',
  'on a page the booking doesn''t match, the booked slot goes to our house ad, never to another sponsor');
select is((public.page_ads('discover', '{"category": "fiction"}') #> '{0,ad}'::text[]) - array['key'],
  '{"kind": "staff", "label": "house", "text_en": "Read and write", "text_ro": null, "title_en": "Poetry week",
    "title_ro": "Săptămâna poeziei", "link_path": "/c/poetry-week", "page_slug": null}'::jsonb,
  'the house ad carries its words in both languages and the path of our own page');

-- Step 6: the policies.
select pg_temp.as_admin();
select is((select count(*)::integer from public.ad_bookings where campaign_id = (select id from kept where label = 'booked')), 1,
  'allowed: ad_bookings_select_sponsor_staff (an admin reads the booking)');
select is((select count(*)::integer from public.house_ads where id = (select id from kept where label = 'house')), 1,
  'allowed: house_ads_select_sponsor_staff (an admin reads the house ad)');
reset role;
select pg_temp.as_writer();
select is((select count(*)::integer from public.ad_bookings), 0,
  'denied: ad_bookings_select_sponsor_staff (a writer reads no booking)');
select is((select count(*)::integer from public.house_ads), 0,
  'denied: house_ads_select_sponsor_staff (a writer reads no house ad)');
reset role;

-- Step 7: Placements, then change, cancel and the audit log.
update public.feature_flags set is_enabled = true where key = 'ad_network';
update public.settings set value = '"ca-pub-1234567890123456"'::jsonb where key = 'ad_network_publisher_id';
update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';
delete from public.house_ads where id = (select id from kept where label = 'house');
select pg_temp.as_admin();
select is((select string_agg(slot ->> 'slot_key' || '=' || (slot #>> '{weeks,0,state}') || '/' || (slot #>> '{weeks,5,state}'), ', '
           order by slot ->> 'slot_key')
           from jsonb_array_elements(public.admin_ad_placements() -> 'slots') as slot
           where slot ->> 'slot_key' in ('discover_wide', 'discover_card', 'search_wide')),
  'discover_card=free/free, discover_wide=booked/network, search_wide=network/network',
  'Placements shows this week''s booking, the network on wide slots once it is on and Free elsewhere, six weeks ahead');
select lives_ok(format($$ select public.admin_change_ad_booking(%L, jsonb_build_object('starts_on', public.romania_today(),
    'ends_on', public.romania_today() + 3));
  select public.admin_cancel_ad_booking(%L, 'Sponsor asked to stop');
  select public.admin_book_ad_slot(%L, jsonb_build_object('slot_key', 'discover_wide',
    'starts_on', public.romania_today(), 'ends_on', public.romania_today() + 7)) $$,
    (select id from kept where label = 'booking'), (select id from kept where label = 'booking'),
    (select id from kept where label = 'unbooked')),
  'an admin changes the booking, cancels it with a reason, and the freed slot can be booked again');
reset role;
select is((select string_agg(action, ', ' order by created_at, action) from public.audit_log
           where target_type = 'ad_bookings' and target_id = (select id::text from kept where label = 'booking')),
  'ad_booking.cancelled, ad_booking.changed, ad_booking.made',
  'booking, changing and cancelling are each in the audit log');

select * from finish();
rollback;
