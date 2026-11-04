-- Database tests for why a story is 16+ or 18+ and the network ads it keeps off (stories
-- S1-E3-06 and S1-E12-04; bundle SPONSORS-f).
-- What it proves:
-- - the writer saves the reasons with a 16+ or 18+ rating; unknown reasons are refused; a rating
--   below 16+ keeps none;
-- - a story with sexual content, nudity or graphic violence ticked shows no network ad on its
--   page; one with only strong language still can; our own ads fill the slot instead;
-- - a moderator adding a reason turns the network off at once, versioned like any setting;
-- - an 18+ story with no reason given gets sexual content, the safe default.
-- Personas: adult_writer (…01, owns the seed story statia-meteo-seed01), moderator (…10).
-- Test data: the seed story's labels and the network settings, changed here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The label of the story page's wide slot for the seed story.
create function pg_temp.story_slot_label() returns text language sql as $$
  select public.page_ads('story', '{"story_slug": "statia-meteo-seed01"}') #>> '{0,ad,label}';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The network on and set up; no landing page, so the network comes before our built-in ads.
update public.landing_pages set archived_at = now() where archived_at is null;
update public.feature_flags set is_enabled = true where key = 'ad_network';
update public.settings set value = '"ca-pub-1234567890123456"'::jsonb where key = 'ad_network_publisher_id';
update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';

-- Step 1: the writer's own saves.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.update_my_story('statia-meteo-seed01',
    '{"labels": {"rating": "16_plus", "rating_reasons": ["strong_language", "strong_language", "drugs"]}}') ->> 'outcome',
  'ok', 'the writer saves 16+ with why: strong language and drugs');
reset role;
select is((select rating_reasons::text from public.stories where slug = 'statia-meteo-seed01'),
  '{strong_language,drugs}', 'the reasons are kept once each, in the list''s order');
select is(pg_temp.story_slot_label(), 'ad', 'strong language alone leaves the network on for the story''s page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.update_my_story('statia-meteo-seed01',
    '{"labels": {"rating": "18_plus", "rating_reasons": ["romance"]}}') $$,
  '23514', null, 'a reason that isn''t on the list is refused');
select public.update_my_story('statia-meteo-seed01',
  '{"labels": {"rating": "18_plus", "rating_reasons": ["sexual_content"]}}');
reset role;
select is(pg_temp.story_slot_label(), 'house',
  'sexual content ticked: the story''s page shows our own ad, never the network');
select is(public.page_ads('discover') #>> '{0,ad,label}', 'ad', 'other pages still show the network');

-- Step 2: moving down to 13+ keeps no reasons.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.update_my_story('statia-meteo-seed01', '{"labels": {"rating": "13_plus"}}');
reset role;
select is((select cardinality(rating_reasons) from public.stories where slug = 'statia-meteo-seed01'), 0,
  'a story moved down to 13+ keeps no reasons');

-- Step 3: a moderator adds a reason to a 16+ story; the network goes off at once.
update public.stories set rating = '16_plus', rating_reasons = '{dark_themes}' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
    '{"rating_reasons": ["dark_themes", "graphic_violence"]}', 'rating_rules', 'Chapter 3 describes a killing in detail.')
    -> 'changed', '["rating_reasons"]'::jsonb,
  'a moderator adds graphic violence; the change is versioned as rating_reasons');
reset role;
select is(pg_temp.story_slot_label(), 'house', 'and the network is off on the story''s page at once');

-- Step 4: staff raise it to 18+ with no reason given; it starts on sexual content.
update public.stories set rating = '18_plus', rating_reasons = '{}' where slug = 'statia-meteo-seed01';
select is((select rating_reasons::text from public.stories where slug = 'statia-meteo-seed01'),
  '{sexual_content}', 'an 18+ story with no reason given starts on sexual content, so the network stays off');

select * from finish();
rollback;
