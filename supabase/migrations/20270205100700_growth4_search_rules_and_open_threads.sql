-- GROWTH-4: what search engines and AI crawlers may read, and Together open to visitors.
-- Decisions: Robert, GROWTH thread (sitemap and SEO review), 26 Nov 2026, 19:45 to 19:48 UTC.
-- - A writer's chapters are not listed: only the story page, with its details. Every chapter of a
--   public-domain classic stays listed ("Only the classics all chapters can be indexable").
-- - Public forum threads are listed, and a visitor who isn't logged in reads the opening post
--   and 2 replies, then is asked to log in.
-- - Private spaces and classes are never listed; fully public spaces are.
-- What it changes:
-- 1. space_is_searchable(): a fully public space (open, not a class, for 16+, not archived,
--    deleted or moderated away). Spaces for under-16s stay out of search, as under-18 profiles
--    do (GROWTH-3).
-- 2. space_search_head(): for a space's address, whether search engines may list it; called by
--    server/space-head.ts so a private space, a class or an under-16s' space carries noindex.
-- 3. forum_thread(): the visitor's limit of three posts and the "more_for_members" flag.
-- 4. sitemap_entries(): step 5 lists classics' chapters only; steps 9 and 10 add public threads
--    and fully public spaces.
-- Who calls them: functions/sitemap.xml.ts, functions/forums/[[path]].ts and
-- functions/spaces/[[path]].ts on Cloudflare, and the thread page (ThreadPage.tsx).

/**
 * space_is_searchable: whether search engines may list a space and its threads.
 * Inputs: the space's ID. Returns: true for a live, open (not class) space for 16+ that isn't
 *   archived or moderated away; false otherwise, and for no such space. Errors: none.
 * Rule: Robert, 26 Nov 2026, 19:48 UTC ("Private spaces and classes are not indexable"; "fully
 *   public spaces can be crawlable and indexable"). A space for under-16s holds children's posts,
 *   so it stays out, as under-18 profiles do (GROWTH-3).
 * Where it fits: sitemap_entries() steps 9 and 10, and space_search_head().
 */
create or replace function public.space_is_searchable(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.spaces
    where spaces.id = target_space_id
      and spaces.kind = 'open'
      and spaces.age_group = '16_plus'
      and spaces.deleted_at is null
      and spaces.archived_at is null
      and not public.is_moderated_away('space', spaces.id));
$$;
comment on function public.space_is_searchable(uuid) is
  'Internal: whether search engines may list a space and its threads: open, for 16+, live (GROWTH-4).';
revoke all on function public.space_is_searchable(uuid) from public, anon, authenticated;

/**
 * space_search_head: whether a space's pages may be listed by search engines.
 * Inputs: the space's slug, as its address spells it (/spaces/<slug>, /forums/space-<slug>/<n>).
 * Returns: {"indexable": true|false}; false for an unknown slug too. Errors: none.
 * Where it fits: server/space-head.ts, which adds noindex to every other space's pages.
 */
create or replace function public.space_search_head(wanted_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('indexable', coalesce((
    select public.space_is_searchable(spaces.id) from public.spaces
    where spaces.slug = wanted_slug and spaces.deleted_at is null
    limit 1), false));
$$;
comment on function public.space_search_head(text) is
  'Whether a space''s pages may be listed by search engines, by slug (GROWTH-4).';
revoke all on function public.space_search_head(text) from public;
grant execute on function public.space_search_head(text) to anon, authenticated;

/**
 * forum_thread: a thread with its numbered posts (S1-E8-02), now with the visitor's limit.
 * Inputs: the thread's number, the last post already shown and, for a permalink, the post to
 *   read up to. Returns: the header, the posts, has_more (members) and more_for_members
 *   (visitors: the posts after the third are for members only), or null when the caller may not
 *   open the thread. Errors: none. Where it fits: the thread page (useForumThread).
 */
create or replace function public.forum_thread(thread_number bigint, after_post integer default 0, up_to_post integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
  page_size integer := coalesce((public.setting_value('forum_posts_page_size'))::integer, 20);
  wanted integer;
  page jsonb;
  last_number integer;
  -- GROWTH-4: a visitor who isn't logged in reads the opening post and 2 replies, then is asked
  -- to log in (Robert, 26 Nov 2026, 19:45 UTC: "after the 2nd reply to the poster they need to
  -- log in to read the rest").
  is_visitor boolean := (select auth.uid()) is null;
  visitor_post_limit constant integer := 3;
  visitor_last integer;
  more_after boolean;
begin
  -- Step 1: the thread, if the caller may open it.
  select * into thread from public.forum_threads where forum_threads.thread_number = forum_thread.thread_number;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    return null;
  end if;
  -- Step 2: for a visitor, the number of the last post they may read: the third post they can
  -- see. Null when the thread has three visible posts or fewer, so there is nothing to hold back.
  if is_visitor then
    select visible.post_number into visitor_last
    from (select forum_posts.post_number from public.forum_posts
          where forum_posts.thread_id = thread.id
            and public.forum_post_state_for_caller(forum_posts) is not null
          order by forum_posts.post_number
          offset visitor_post_limit - 1
          limit 1) as visible;
  end if;
  -- Step 3: how far to read: a page, or as far as the permalink's post.
  wanted := greatest(page_size, coalesce(up_to_post, 0) - coalesce(after_post, 0));
  -- Step 4: the posts after after_post, in number order, without the ones the caller can't see,
  -- and for a visitor none after visitor_last.
  with listed as (
    select forum_posts.* from public.forum_posts
    where forum_posts.thread_id = thread.id
      and forum_posts.post_number > coalesce(after_post, 0)
      and (visitor_last is null or forum_posts.post_number <= visitor_last)
      and public.forum_post_state_for_caller(forum_posts) is not null
    order by forum_posts.post_number
    limit wanted
  )
  select coalesce(jsonb_agg(public.forum_post_json(listed, thread.user_id) order by listed.post_number), '[]'::jsonb),
         max(listed.post_number)
  into page, last_number
  from listed;
  -- Step 5: is there a visible post after the last one read? For a member that is "Show more
  -- replies". For a visitor, posts up to visitor_last still page as before; the posts after it
  -- are never sent, and more_for_members tells the page to ask them to log in.
  more_after := exists (select 1 from public.forum_posts
                        where forum_posts.thread_id = thread.id
                          and forum_posts.post_number > coalesce(last_number, coalesce(after_post, 0))
                          and (visitor_last is null or forum_posts.post_number <= visitor_last)
                          and public.forum_post_state_for_caller(forum_posts) is not null);
  return jsonb_build_object(
    'thread', public.forum_thread_header_json(thread),
    'posts', page,
    'has_more', more_after,
    'more_for_members', visitor_last is not null and exists (
      select 1 from public.forum_posts
      where forum_posts.thread_id = thread.id
        and forum_posts.post_number > visitor_last
        and public.forum_post_state_for_caller(forum_posts) is not null));
end;
$$;


comment on function public.forum_thread(bigint, integer, integer) is
  'A thread with its numbered posts in order, for the thread page; a visitor gets the first three only (S1-E8-02, GROWTH-4).';
grant execute on function public.forum_thread(bigint, integer, integer) to anon, authenticated;

/**
 * sitemap_entries: every address search engines may list (S1-E11-38, CALM-9s, GROWTH-2 and 3),
 * now with classics' chapters only, public forum threads and fully public spaces (GROWTH-4).
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

