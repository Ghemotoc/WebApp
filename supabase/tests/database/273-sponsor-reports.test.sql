-- Database tests for sponsor reports (story S1-E12-03; bundle SPONSORS-c).
-- What it proves:
-- - criterion 1: a visitor's impression and click add to the live campaign's total for today,
--   with no cookie and no user ID (the table has no column for one); a campaign that isn't live,
--   a bad key or an unknown kind count nothing and raise nothing;
-- - only owner and admin read the totals (campaign_daily_stats_select_sponsor_staff, allowed and
--   denied) and the report;
-- - criterion 2: the report lists every day of the run so far, days with nothing as zeros;
-- - "Sponsored by" gives its campaign's key, so the line counts too.
-- Personas: adult_writer (…01), admin (…09), moderator (…10).
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;

create temporary table kept (label text primary key, id uuid);
grant all on kept to anon, authenticated;

-- Step 1: a sponsor, a live credit on poetry that started two days ago and a draft campaign.
insert into public.sponsors (name) values ('Raport Test');
insert into public.sponsor_campaigns (sponsor_id, name, placement, category_slug, starts_on, ends_on, state)
select id, 'Live', 'category', 'poetry', public.romania_today() - 2, public.romania_today() + 10, 'approved'
from public.sponsors where name = 'Raport Test';
insert into public.sponsor_campaigns (sponsor_id, name, placement, category_slug, starts_on, ends_on, state)
select id, 'Draft', 'category', 'fiction', public.romania_today() - 2, public.romania_today() + 10, 'draft'
from public.sponsors where name = 'Raport Test';
insert into kept (label, id) select lower(name), id from public.sponsor_campaigns
  where sponsor_id = (select id from public.sponsors where name = 'Raport Test');

-- Step 2: a visitor sees the live credit twice and follows it once.
select pg_temp.as_visitor();
select is(public.sponsor_credit('category', 'poetry') ->> 'ad_key', 'campaign:' || (select id from kept where label = 'live'),
  '"Sponsored by" gives its campaign''s key, so the line can be counted');
select lives_ok($$ select public.record_sponsor_event('campaign:' || (select id from kept where label = 'live'), 'impression') $$,
  'a visitor may count an impression');
select public.record_sponsor_event('campaign:' || (select id from kept where label = 'live'), 'impression');
select public.record_sponsor_event('campaign:' || (select id from kept where label = 'live'), 'click');
-- Nothing else counts, and nothing raises.
select lives_ok($$ select public.record_sponsor_event('campaign:' || (select id from kept where label = 'draft'), 'impression');
                   select public.record_sponsor_event('campaign:not-a-campaign', 'click');
                   select public.record_sponsor_event('campaign:' || (select id from kept where label = 'live'), 'hover') $$,
  'a campaign that isn''t live, a bad key or an unknown kind is ignored without an error');
-- A visitor has no grant on the totals at all; the denied policy test is the writer's, below.
reset role;

select is((select impressions || ' · ' || clicks from public.campaign_daily_stats
           where campaign_id = (select id from kept where label = 'live') and counted_on = public.romania_today()),
  '2 · 1', 'today''s row for the live campaign holds two impressions and one click');
select is((select count(*)::integer from public.campaign_daily_stats where campaign_id = (select id from kept where label = 'draft')),
  0, 'the draft campaign counted nothing');
select is((select count(*)::integer from information_schema.columns
           where table_schema = 'public' and table_name = 'campaign_daily_stats' and column_name like '%user%'),
  0, 'the totals have no column for a user');

-- Step 3: who reads them.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.campaign_daily_stats), 1,
  'allowed: campaign_daily_stats_select_sponsor_staff lets an admin read the totals');
select is(public.admin_sponsor_campaign_report((select id from kept where label = 'live')),
  jsonb_build_array(
    jsonb_build_object('day', public.romania_today() - 2, 'impressions', 0, 'clicks', 0),
    jsonb_build_object('day', public.romania_today() - 1, 'impressions', 0, 'clicks', 0),
    jsonb_build_object('day', public.romania_today(), 'impressions', 2, 'clicks', 1)),
  'the report lists every day of the run so far, with zeros for the quiet days');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format('select public.admin_sponsor_campaign_report(%L)', (select id from kept where label = 'live')),
  '42501', null, 'a moderator can''t read a sponsor report');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.campaign_daily_stats), 0,
  'denied: campaign_daily_stats_select_sponsor_staff hides the totals from a writer');
reset role;

select * from finish();
rollback;
