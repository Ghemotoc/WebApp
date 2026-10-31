-- Database tests for onboarding, "Set up your profile" (story S1-E2-06; CLAUDE.md rules 1, 15).
-- What it proves:
-- - the steps are due for a new account, not for one already set up, and not while the age check
--   is pending (criterion 1: setup comes after the age check);
-- - only the username is required to finish (criterion 1);
-- - the county is optional and must be one on the list;
-- - likes are the person's own explicit choices and fill the "Picked for you" list (criterion 2);
-- - only a 16 or 17-year-old has the "let adults message me" switch, and it starts off
--   (criterion 3; S1-E9-03);
-- - policies regions_select_everyone and reading_preferences_select_own: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer (…01) and teen_17 (…02) are new again for these tests; kid_14_waiting (…04) waits
-- for a parent; minors may join, so adults_only is off.
update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.profiles set onboarded_at = null
  where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
-- A recommended topic to pick, and one that isn't recommended.
create temporary table chosen_topics as
  select (select id from public.tags where is_recommended and status = 'approved' order by name limit 1) as recommended,
         (select id from public.tags where not is_recommended limit 1) as other;
grant select on chosen_topics to authenticated;

/* ---------- 1. When the steps are due ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_onboarding() ->> 'is_due')::boolean, true, 'a new adult sees the steps');
select is(public.my_onboarding() ->> 'age_band', '18_plus', 'the steps know the age group, never the year');
select ok(not (public.my_onboarding() ? 'birth_year'), 'the year of birth is never returned');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((public.my_onboarding() ->> 'is_due')::boolean, false, 'an account already set up doesn''t see them');
select pg_temp.as_owner();
update public.profiles set onboarded_at = null, age_check_result = 'pending'
  where id = '00000000-0000-4000-8000-000000000004';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.my_onboarding() ->> 'is_due')::boolean, false, 'not while the age check is pending');
select pg_temp.sign_out();
select is(public.my_onboarding() ->> 'outcome', 'signed_out', 'signed out, there is nothing to set up');
select throws_ok($$ select public.finish_onboarding() $$, '42501', null, 'denied: a visitor can''t finish setup');

/* ---------- 2. The county ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.save_my_region('RO-CJ') $$, 'a person may pick a county');
select is(public.my_onboarding() ->> 'region_code', 'RO-CJ', 'the county is kept');
select throws_ok($$ select public.save_my_region('RO-XX') $$, '23514', null, 'a county not on the list is refused');
select lives_ok($$ select public.save_my_region(null) $$, 'the county can be cleared');
select is(public.my_onboarding() ->> 'region_code', null, 'and is gone');
select is((select count(*)::integer from public.regions where country_code = 'RO'), 42,
  'Romania''s 41 counties and Bucharest are listed');
select pg_temp.sign_out();
select ok((select count(*) from public.regions) > 0, 'allowed: regions_select_everyone: a visitor reads the counties');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into public.regions (code, country_code, name_ro, name_en) values ('RO-ZZ', 'RO', 'Z', 'Z') $$,
  '42501', null, 'denied: regions_select_everyone: nobody adds a county');

/* ---------- 3. Likes ---------- */

select lives_ok($$ select public.save_my_preferences(array['poetry'], array['fiction'],
  array[(select recommended from chosen_topics)]) $$, 'a person saves what they like');
select is(public.my_onboarding() -> 'read_categories', '["poetry"]'::jsonb, 'the categories to read are kept');
select is(public.my_onboarding() -> 'write_categories', '["fiction"]'::jsonb, 'the categories to write are kept');
select is(jsonb_array_length(public.my_onboarding() -> 'topic_tag_ids'), 1, 'the topic is kept');
select throws_ok($$ select public.save_my_preferences(array['cookery'], null, null) $$, '23514', null,
  'a category that doesn''t exist is refused');
select throws_ok($$ select public.save_my_preferences(null, null, array[(select other from chosen_topics)]) $$,
  '23514', null, 'a tag that isn''t a recommended topic is refused');
select is((select count(*)::integer from public.reading_preferences), 3,
  'allowed: reading_preferences_select_own: a person reads their own likes');
select throws_ok($$ insert into public.reading_preferences (user_id, preference_kind, category_id)
  values ('00000000-0000-4000-8000-000000000001', 'read', (select id from public.categories limit 1)) $$,
  '42501', null, 'denied: nobody writes likes directly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.reading_preferences), 0,
  'denied: reading_preferences_select_own: nobody reads someone else''s likes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(
  not exists (
    select 1 from jsonb_array_elements(public.browse_stories('picked') -> 'stories') as card
    join public.stories on stories.slug = card ->> 'slug'
    join public.categories on categories.id = stories.category_id
    where categories.slug <> 'poetry'
      and not exists (select 1 from public.story_tags where story_tags.story_id = stories.id
                      and story_tags.tag_id = (select recommended from chosen_topics))),
  '"Picked for you" holds only stories in a liked category or with a picked topic');

/* ---------- 4. Adult messages and finishing ---------- */

select throws_ok($$ select public.set_adults_may_message(true) $$, '42501', null,
  'an adult has no "let adults message me" switch');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.my_onboarding() ->> 'adults_may_message')::boolean, false,
  'a 17-year-old starts with adult messages off');
select lives_ok($$ select public.set_adults_may_message(true) $$, 'a 17-year-old may switch them on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.set_adults_may_message(true) $$, '42501', null,
  'an under-16 can never let adults message them');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.finish_onboarding() $$, 'finishing needs only the username');
select is((public.my_onboarding() ->> 'is_due')::boolean, false, 'and the steps stop showing');

select * from finish();
rollback;
