-- GROWTH-3: adult writers' profiles, public reading lists and categories open to search engines.
--
-- Decision: Robert, GROWTH thread (sitemap and SEO review), 26 Nov 2026, 15:13 UTC: "Profile for
-- adults, read lists, categories, writers, chapters. Yes." Chapters came in GROWTH-2; this adds
-- the rest. Under-18s stay out of search entirely: their profiles say noindex and are never in
-- the sitemap, and their reading lists are left out too.
--
-- 1. story_is_searchable(): the step 4 test of sitemap_entries() as one function, so steps 6 to 8
--    ask the same question: published, public, for everyone, readable on the web, not deleted,
--    not moderated away and hidden in no country.
-- 2. profile_is_searchable(): an adult (age_band_of() is 18_plus) who shows their whole profile to
--    everyone (S1-E13-01), not deleted and not moderated away.
-- 3. reading_list_is_searchable(): a public reading list, not deleted or moderated away, of a
--    searchable profile, with at least one searchable story in it.
-- 4. profile_search_head(): what the profile's page head says to search engines and link
--    previews: the name, the bio (only when the whole profile is open to everyone) and whether it
--    may be indexed. Read by server/profile-head.ts for /u/<handle>.
-- 5. sitemap_entries(): adds the profiles, reading lists and category pages (steps 6 to 8).
-- Who calls them: functions/u/[[path]].ts and functions/sitemap.xml.ts (server/profile-head.ts and
-- server/sitemap.ts). Only profile_search_head() and sitemap_entries() are callable from outside.

/**
 * story_is_searchable: whether a story is one search engines may list (sitemap step 4).
 * Inputs: the story's ID. Returns: true or false (false when there is no such story).
 * Errors: none. Where it fits: sitemap_entries() steps 6 to 8 and reading_list_is_searchable().
 */
create or replace function public.story_is_searchable(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select stories.first_published_at is not null and stories.deleted_at is null
      and stories.visibility = 'public' and not stories.class_only
      and not public.story_app_only_applies(stories.is_app_only)
      and not public.is_moderated_away('story', stories.id)
      and cardinality(stories.hidden_in_countries) = 0
    from public.stories where stories.id = target_story_id), false);
$$;

comment on function public.story_is_searchable(uuid) is
  'Internal: a story search engines may list: published, public, web, not moderated or hidden (GROWTH-3).';
revoke all on function public.story_is_searchable(uuid) from public, anon, authenticated;

/**
 * profile_is_searchable: whether search engines may list someone's profile.
 * Inputs: the person's ID. Returns: true only for a live adult whose whole profile is open to
 *   everyone and not moderated away. Errors: none.
 * Rule: Robert, 26 Nov 2026, 15:13 UTC, "Profile for adults"; under-18s are never indexed.
 * Where it fits: profile_search_head(), reading_list_is_searchable() and sitemap_entries().
 */
create or replace function public.profile_is_searchable(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select profiles.handle is not null and profiles.deleted_at is null
      -- Adults only: the age group worked out the same way age_band() does.
      and public.age_band_of(profiles.id) = '18_plus'
      -- Their own choice (S1-E13-01): only a profile open to everyone, signed out included.
      and public.profile_audience_of(profiles) = 'everyone'
      and not public.is_moderated_away('profile', profiles.id)
    from public.profiles where profiles.id = person_id), false);
$$;

comment on function public.profile_is_searchable(uuid) is
  'Internal: an adult profile open to everyone and not moderated away, which search engines may list (GROWTH-3).';
revoke all on function public.profile_is_searchable(uuid) from public, anon, authenticated;

/**
 * reading_list_is_searchable: whether search engines may list a reading list's page.
 * Inputs: the list's ID. Returns: true for a public, live list of a searchable profile with at
 *   least one searchable story in it. Errors: none.
 * Where it fits: sitemap_entries() steps 6 and 7.
 */
create or replace function public.reading_list_is_searchable(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select reading_lists.is_public and reading_lists.deleted_at is null
      and not public.is_moderated_away('reading_list', reading_lists.id)
      and public.profile_is_searchable(reading_lists.user_id)
      and exists (select 1 from public.reading_list_stories
                  where reading_list_stories.list_id = reading_lists.id
                    and public.story_is_searchable(reading_list_stories.story_id))
    from public.reading_lists where reading_lists.id = target_list_id), false);
$$;

comment on function public.reading_list_is_searchable(uuid) is
  'Internal: a public reading list of an adult with a listed story, which search engines may list (GROWTH-3).';
revoke all on function public.reading_list_is_searchable(uuid) from public, anon, authenticated;

/**
 * profile_search_head: what a profile's page head tells search engines and link previews.
 * Inputs: the username. Returns: {display_name, bio, indexable}, or null when there is no live
 *   profile or a moderator hid it. The bio is empty unless the whole profile is open to everyone;
 *   never the user ID, age, email or anything else private (architecture 1.6).
 * Errors: none. Where it fits: server/profile-head.ts, for /u/<handle> (GROWTH-3).
 */
create or replace function public.profile_search_head(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  person public.profiles;
  is_open boolean;
begin
  -- Step 1: the live profile behind the username; none, or one a moderator hid, has no head.
  select * into person from public.profile_for_handle(wanted_handle);
  if not found or public.is_moderated_away('profile', person.id) then
    return null;
  end if;
  -- Step 2: the bio only when its owner shows the whole profile to everyone (S1-E13-01).
  is_open := public.profile_audience_of(person) = 'everyone';
  -- Step 3: the answer; indexable only for an adult (profile_is_searchable()).
  return jsonb_build_object(
    'display_name', public.display_name(person.handle, person.pen_name),
    'bio', case when is_open then coalesce(person.bio, '') else '' end,
    'indexable', public.profile_is_searchable(person.id));
end;
$$;

comment on function public.profile_search_head(text) is
  'A profile''s name, open bio and whether search engines may index it, for the page head (GROWTH-3).';
revoke all on function public.profile_search_head(text) from public;
grant execute on function public.profile_search_head(text) to anon, authenticated;

/**
 * sitemap_entries: every address search engines may list (S1-E11-38, CALM-9s, GROWTH-2), now with
 * adult writers' profiles, their public reading lists and the categories (GROWTH-3).
 * Inputs: none. Returns: the path and the day it last changed. Errors: none.
 * Where it fits: server/sitemap.ts, for /sitemap.xml.
 */
create or replace function public.sitemap_entries()
returns table (path text, changed_on date)
language sql
stable
security definer
set search_path = ''
as $$
  with places as (
    -- Each open market in each of its open languages: "/ro/ro", "/ro/en".
    select listed.country_code, spoken.language_code,
      '/' || lower(listed.country_code) || '/' || spoken.language_code as prefix
    from public.website_places() as listed
    cross join unnest(listed.listed_languages) as spoken (language_code)
  )
  (
    -- Step 1: the home page and the help centre at each place, and Discover. The home page and
    -- Discover change every day.
    select places.prefix, public.romania_today() from places
    union all
    select '/discover', public.romania_today()
    union all
    select places.prefix || '/help', null::date from places
    union all
    -- Step 2: each help page a visitor there can read (in that language or in English), unless
    -- staff hid it (S1-E11-37).
    select places.prefix || '/help/' || live.entry_key, max(live.show_from)
    from places
    join public.cms_live_versions('help_page') as live
      on (live.market_code is null or live.market_code = places.country_code)
      and live.language_code in (places.language_code, 'en')
    where (live.content -> 'search' -> 'hidden') is distinct from 'true'::jsonb
    group by places.prefix, live.entry_key
    union all
    -- Step 3: each landing page with a live version, unless staff hid it (S1-E11-38).
    select places.prefix || '/c/' || pages.slug, live.show_from
    from places
    cross join public.landing_pages as pages
    cross join lateral public.landing_page_live_version(pages.id) as live
    where pages.archived_at is null and live.id is not null
      and (live.content -> 'search' -> 'hidden') is distinct from 'true'::jsonb
    union all
    -- Step 4: public stories: published once, public, for everyone (not a class's), readable on
    -- the web, not deleted and not hidden by a moderator. Every rating alike (S1-E11-36).
    select '/s/' || stories.slug, coalesce(stories.last_chapter_published_at, stories.first_published_at)::date
    from public.stories
    where stories.first_published_at is not null and stories.deleted_at is null
      and stories.visibility = 'public' and not stories.class_only
      and not public.story_app_only_applies(stories.is_app_only)
      and not public.is_moderated_away('story', stories.id)
      -- CALM-9s: a story hidden in any country stays out, as search engines list worldwide.
      and cardinality(stories.hidden_in_countries) = 0
    union all
    -- Step 5 (GROWTH-2): each readable chapter of a story listed in step 4 that visitors get
    -- text from: the whole chapter for a classic, the teaser for a writer's story. 16+ and 18+
    -- chapters show visitors no text, so they stay out.
    select '/s/' || stories.slug || '/' || chapters.code,
      coalesce(chapters.edited_at, chapters.first_published_at)::date
    from public.stories
    join public.chapters on chapters.story_id = stories.id
    where stories.first_published_at is not null and stories.deleted_at is null
      and stories.visibility = 'public' and not stories.class_only
      and stories.rating not in ('16_plus', '18_plus')
      and not public.story_app_only_applies(stories.is_app_only)
      and not public.is_moderated_away('story', stories.id)
      and cardinality(stories.hidden_in_countries) = 0
      and public.chapter_is_readable(chapters.id)
    union all
    -- Step 6 (GROWTH-3): the profile of each adult who shows it to everyone and has a story in
    -- step 4 or a public reading list in step 7. Under-18s never appear here (Robert, 26 Nov
    -- 2026, 15:13 UTC: "Profile for adults").
    select '/u/' || profiles.handle, profiles.updated_at::date
    from public.profiles
    where public.profile_is_searchable(profiles.id)
      and (exists (select 1 from public.stories
                   where stories.user_id = profiles.id and public.story_is_searchable(stories.id))
           or exists (select 1 from public.reading_lists
                      where reading_lists.user_id = profiles.id
                        and public.reading_list_is_searchable(reading_lists.id)))
    union all
    -- Step 7 (GROWTH-3): each public reading list of such an adult with a listed story in it.
    select '/library/lists/' || reading_lists.id, reading_lists.updated_at::date
    from public.reading_lists
    where public.reading_list_is_searchable(reading_lists.id)
    union all
    -- Step 8 (GROWTH-3): each category's See all page, once a listed story is in it.
    select '/discover/c/' || categories.slug, public.romania_today()
    from public.categories
    where exists (select 1 from public.stories
                  where stories.category_id = categories.id and public.story_is_searchable(stories.id))
  )
  limit 50000;
$$;
