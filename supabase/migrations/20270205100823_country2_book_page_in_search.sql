-- Migration COUNTRY-2: a story hidden in some countries keeps its book page in search engines
-- (Robert, 27 Nov 2026, decision card at 22:06 UTC and his messages at 22:17 and 22:21 UTC).
--
-- Why: until now a story hidden in any country (COUNTRY-1) left the sitemap and its pages carried
-- noindex (CALM-9s), because search engines list pages worldwide. Robert's rule replaces that:
-- - the book page (/s/<story>) of a public story stays indexable and in the sitemap everywhere,
--   whether a writer or staff (a classic) hid it in some countries: "that book can still be found
--   on Google, but when they go to the page, then they will say, sorry, this is not available in
--   your country";
-- - its chapters are never indexed and never in the sitemap, a classic's included (Peter Pan,
--   Orwell), so no country-hidden text is listed anywhere;
-- - a reader, or a search engine's crawler, connecting from a hidden country gets the same page
--   a reader there gets: "Sorry, this book isn't available in your country" (reader_visible_story()
--   and get_chapter() already refuse it there, COUNTRY-1). Nothing about the countries is shown;
-- - keeping a book page off search engines altogether is a future premium feature (not built).
-- Unlisted and private stories stay out of search, as before.
--
-- What changes:
-- 1. story_is_searchable(): no longer refuses a country-hidden story, so its writer's profile and
--    its category's See all page still count it (GROWTH-3).
-- 2. sitemap_entries(): step 4 lists such a story's book page; step 5 still leaves out every
--   chapter of a story hidden anywhere.
-- get_link_preview() keeps `is_hidden_somewhere`; server/link-preview.ts now reads it only for
-- chapters (noindex), and the app's story footer shows the statement for such a story.
-- Who calls it: server/sitemap.ts (/sitemap.xml) and the GROWTH-3 search heads.
-- Personal data: none.

/**
 * story_is_searchable: whether search engines may list a story's book page.
 * Inputs: the story's ID. Returns: true for a published, public, web, not-class, not moderated
 *   story, whether or not it is hidden in some countries (COUNTRY-2). Errors: none.
 * Where it fits: profile, reading list and category search heads and sitemap_entries() (GROWTH-3).
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
    from public.stories where stories.id = target_story_id), false);
$$;

comment on function public.story_is_searchable(uuid) is
  'Internal: a story whose book page search engines may list: published, public, web, not moderated; a country block keeps only its chapters out (GROWTH-3, COUNTRY-2).';
revoke all on function public.story_is_searchable(uuid) from public, anon, authenticated;

/**
 * sitemap_entries: every address search engines may list (S1-E11-38, CALM-9s, GROWTH-2 and 3),
 * with classics' chapters only, public forum threads and fully public spaces (GROWTH-4), and the
 * book page of a story hidden in some countries but none of its chapters (COUNTRY-2).
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
      -- COUNTRY-2: a story hidden in some countries keeps its book page here; readers there see
      -- "Sorry, this book isn't available in your country" (Robert, 27 Nov 2026, 22:17 UTC).
    union all
    -- Step 5 (GROWTH-2, narrowed by GROWTH-4): each readable chapter of a public-domain classic
    -- listed in step 4. A writer's chapters stay out of search (Robert, 26 Nov 2026, 19:45 UTC:
    -- "the chapters of user generated content should not be crawlable, just the book page").
    -- 16+ and 18+ chapters show visitors no text, so they stay out too.
    select '/s/' || stories.slug || '/' || chapters.code,
      coalesce(chapters.edited_at, chapters.first_published_at)::date
    from public.stories
    join public.chapters on chapters.story_id = stories.id
    where stories.first_published_at is not null and stories.deleted_at is null
      and stories.visibility = 'public' and not stories.class_only
      and stories.rating not in ('16_plus', '18_plus')
      and not public.story_app_only_applies(stories.is_app_only)
      and not public.is_moderated_away('story', stories.id)
      -- COUNTRY-2: no chapter of a story hidden anywhere is listed, a classic's included.
      and cardinality(stories.hidden_in_countries) = 0
      and stories.classic_author_id is not null
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
    union all
    -- Step 9 (GROWTH-4): each live thread in a staff forum or in a fully public space (Robert,
    -- 26 Nov 2026, 19:47 and 19:48 UTC: "public forum threads"; "fully public spaces can be
    -- crawlable and indexable"). Private spaces and classes never appear.
    select '/forums/' || forums.slug || '/' || forum_threads.thread_number,
      forum_threads.last_post_at::date
    from public.forum_threads
    join public.forums on forums.id = forum_threads.forum_id and forums.deleted_at is null
    where forum_threads.deleted_at is null
      and not public.is_moderated_away('forum_thread', forum_threads.id)
      and (forums.space_id is null or public.space_is_searchable(forums.space_id))
    union all
    -- Step 10 (GROWTH-4): each fully public space's own page.
    select '/spaces/' || spaces.slug, spaces.updated_at::date
    from public.spaces
    where public.space_is_searchable(spaces.id)
  )
  limit 50000;
$$;

