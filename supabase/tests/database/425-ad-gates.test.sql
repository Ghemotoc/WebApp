-- Database tests for the ad network's gates (story S1-E12-04; bundle AD-GATES; Robert, 27 Nov
-- 2026, 17:40 UTC: no network ads in class spaces, for readers under 16, or on stories labelled
-- Erotica; every other mature story gets them).
-- What it proves:
-- - an 18+ story with sexual content ticked gets the network now (the 2 Nov 2026 rule is gone);
-- - a story with an 18+ genre (Erotica, Erotic romance, Erotic poetry) never does;
-- - a reader aged 13 to 15, or a member whose age isn't known, never gets it anywhere;
-- - a 17-year-old and an adult do, and our own ad fills the slot whenever the network can't;
-- - no client role can ask network_ads_barred() directly.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03).
-- Test data: settings, flags and stories changed here; rolled back.
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
-- The label of the first ad on a story's page: 'ad' for the network, 'house' for our own.
create function pg_temp.story_ad(slug text) returns text language sql as $$
  select public.page_ads('story', jsonb_build_object('story_slug', slug)) #>> '{0,ad,label}';
$$;
grant execute on function pg_temp.story_ad(text) to anon, authenticated;

-- Step 1: the network on and set up, no live landing page, and seed01 an 18+ story with
-- sexual content ticked.
update public.feature_flags set is_enabled = true where key = 'ad_network';
update public.settings set value = '"ca-pub-1234567890123456"'::jsonb where key = 'ad_network_publisher_id';
update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';
update public.landing_pages set archived_at = now() where archived_at is null;
update public.stories set rating = '18_plus', rating_reasons = '{sexual_content}' where slug = 'statia-meteo-seed01';

-- Step 2: a mature story gets the network; Erotica doesn't.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.story_ad('statia-meteo-seed01'), 'ad',
  'an adult reading an 18+ story with sexual content ticked sees the network''s ad');
reset role;
update public.stories set genre_slugs = '{erotica}' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.story_ad('statia-meteo-seed01'), 'house',
  'on a story labelled Erotica our own ad fills the slot instead');
reset role;
update public.stories set genre_slugs = '{erotic_poetry, romance}' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.story_ad('statia-meteo-seed01'), 'house',
  'any 18+ genre among a story''s genres keeps the network off');
reset role;
update public.stories set genre_slugs = '{romance}' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.story_ad('statia-meteo-seed01'), 'ad',
  'once the 18+ genre is gone, the network comes back');

-- Step 3: the reader's age, on a page every age may read (seed02 is All ages).
reset role;
update public.stories set rating = 'all_ages' where slug = 'the-girl-who-fixed-radios-seed02';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.story_ad('the-girl-who-fixed-radios-seed02'), 'house',
  'a 14-year-old never sees the network''s ad, even on an All ages story');
select is(public.page_ads('discover') #>> '{0,ad,label}', 'house',
  'nor on Discover');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.story_ad('the-girl-who-fixed-radios-seed02'), 'ad',
  'a 17-year-old does');
-- A signed-in session with no live profile behind it (an account mid-deletion) has no known age.
select pg_temp.sign_in('00000000-0000-4000-8000-0000000000ff');
select is(pg_temp.story_ad('the-girl-who-fixed-radios-seed02'), 'house',
  'a member whose age isn''t known gets our own ad, the safe default');

-- Step 4: the gate itself is internal.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.network_ads_barred('{}'::jsonb) $$, '42501', null,
  'a member can''t call network_ads_barred() directly');

select * from finish();
rollback;
