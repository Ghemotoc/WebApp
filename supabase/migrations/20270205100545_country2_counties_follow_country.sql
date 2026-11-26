/*
 * COUNTRY-2: the county list follows the person's country (trial bug, Robert, 26 Nov 2026).
 *
 * Why: setup step 1 says "We work out your country from your connection", but its "County
 * (optional)" drop-down listed Romania's counties to everyone, a person in Sweden included. The
 * counties a person may pick are now only those of the country on their profile
 * (profiles.country_code, set at sign-up from the connection or chosen, MARKETS-1); a country
 * with no counties in public.regions shows no county field at all.
 *
 * What changes:
 * - my_onboarding() also answers country_code, so the screens can show the country by name and
 *   offer only its counties;
 * - save_my_region() refuses a county of another country (the database is the security boundary,
 *   architecture 1.1, principle 3), with the same unknown_region hint as before.
 * Who calls them: src/features/onboarding/ (step 1 and Settings › What you like).
 */

/**
 * my_onboarding: what the steps need for the signed-in person.
 * Returns: jsonb {outcome: 'ok' | 'signed_out', is_due, has_handle, age_band, country_code,
 *   region_code, adults_may_message, read_categories, write_categories, topic_tag_ids}. Never the
 *   year of birth. country_code is null when no country is known.
 * Errors: none. Called by: useMyOnboarding (src/features/onboarding/).
 */
create or replace function public.my_onboarding()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'outcome', 'ok',
      'is_due', public.onboarding_is_due(profiles.id),
      'has_handle', profiles.handle is not null,
      'age_band', public.age_band(),
      -- COUNTRY-2: the profile's country, so only its counties are offered.
      'country_code', profiles.country_code,
      'region_code', profiles.region_code,
      'adults_may_message', profiles.adults_may_message,
      'read_categories', coalesce((
        select jsonb_agg(categories.slug order by categories.position)
        from public.reading_preferences join public.categories on categories.id = reading_preferences.category_id
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'read'), '[]'),
      'write_categories', coalesce((
        select jsonb_agg(categories.slug order by categories.position)
        from public.reading_preferences join public.categories on categories.id = reading_preferences.category_id
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'write'), '[]'),
      'topic_tag_ids', coalesce((
        select jsonb_agg(reading_preferences.tag_id)
        from public.reading_preferences
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'topic'), '[]'))
    from public.profiles
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null),
    jsonb_build_object('outcome', 'signed_out'));
$$;
comment on function public.my_onboarding() is
  'The signed-in person''s onboarding: whether it is due, their country and county, likes and the adult messages switch (S1-E2-06, COUNTRY-2).';

/**
 * save_my_region: sets or clears the caller's county.
 * Input: wanted_region, a regions code of the caller's own country; null or left out clears it.
 * Errors: insufficient_privilege (hint signed_out); check_violation (hint unknown_region) when
 *   the county is unknown or belongs to another country (COUNTRY-2).
 * Called by: step 1 and Settings.
 */
create or replace function public.save_my_region(wanted_region text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
begin
  -- Step 1: a county must be on the list and in the country on the caller's profile.
  if wanted_region is not null and not exists (
    select 1 from public.regions
    join public.profiles on profiles.id = caller
    where regions.code = wanted_region and regions.country_code = profiles.country_code) then
    raise exception 'Pick a county from the list.' using errcode = 'check_violation', hint = 'unknown_region';
  end if;
  -- Step 2: store it, or clear it.
  update public.profiles set region_code = wanted_region where id = caller;
end;
$$;
comment on function public.save_my_region(text) is
  'Sets or clears the caller''s county, which must be in their own country (S1-E2-06, COUNTRY-2).';
