/**
 * Migration CALM-9s: the story footer and its search details (Robert's canvas comments of
 * 23 Nov 2026, approved the same day; boards B01 to B06).
 *
 * Why: the story page and the reader end with one sentence, "[Title] is a [genre] [type]
 * published on [site] by [pen name or username].", then the blurb. The same words go into the
 * page's description, its Open Graph description and its JSON-LD, so people, search engines and
 * answer engines read one consistent statement. get_link_preview() already gives a visitor's
 * view of a story to the link preview (server/link-preview.ts) and the app; it now also gives:
 * - `genre`: the story's first approved, staff-recommended tag in its language (the curated
 *   topic list onboarding offers), or null; never a free tag a writer typed;
 * - `writer.handle`: the username, for the profile link; null for a public-domain classic, whose
 *   author has no profile (S1-E5-06);
 * - `first_published_at` and `updated_at`: for datePublished and dateModified;
 * - `is_app_only`: "In the app only" while it applies (GAPS-15), which keeps the page out of
 *   search engines and the footer generic;
 * - `is_hidden_somewhere`: true when the story is hidden in at least one country (country block,
 *   21 Nov 2026). Search engines list pages worldwide, so such a story is never listed; which
 *   countries stays private;
 * - `editions`: the story's readable public editions (slug and language), for hreflang.
 * Never the user ID, an age, a real name or chapter text.
 * Who calls it: server/link-preview.ts (shared links and search engines) and the app's story page
 * and reader (src/features/reading/api/storyStatement.ts).
 */
create or replace function public.get_link_preview(story_slug text, chapter_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  chapter public.chapters;
  chapter_part jsonb;
begin
  -- Step 1: a live story with at least one chapter published once, not hidden by a moderator.
  -- A private story is the writer's alone (NEW-1) and a class-only story is the class's
  -- (S1-E8-11): neither has a public preview (S1-E11-36).
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or story.visibility = 'private' or story.class_only
     or public.is_moderated_away('story', story.id) then
    return null;
  end if;
  -- S1-E11-08: a link preview never shows a hidden title or cover.
  story := public.story_as_shown(story);
  -- Step 2: the chapter, when the address names one; it must be readable.
  if chapter_code is not null then
    select * into chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = story.id;
    if not found or not public.chapter_is_readable(chapter.id) then
      return null;
    end if;
    chapter_part := jsonb_build_object('code', chapter.code, 'title', chapter.published_title);
  end if;
  -- Step 3: the preview. The same details for every rating (Robert, 11 Nov 2026); only the text
  -- stays closed to visitors on 16+ and 18+ (Q6), which `hides_text` tells the caller.
  return jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'rating', story.rating,
    'language_code', story.language_code,
    'hides_text', story.rating in ('16_plus', '18_plus'),
    -- Only a public story is for search engines; an unlisted one is shared by its link only.
    'is_listed', story.visibility = 'public',
    'is_app_only', public.story_app_only_applies(story.is_app_only),
    'is_hidden_somewhere', cardinality(story.hidden_in_countries) > 0,
    'blurb', story.blurb,
    -- The username links to the profile; a classic's author has none (S1-E5-06).
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', case when story.classic_author_id is null then profiles.handle end)
      from public.profiles where profiles.id = story.user_id),
    'cover', jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', story.cover_style, 'title_font', story.cover_title_font),
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'genre', public.story_genre_name(story.id, story.language_code),
    'tags', public.story_search_tags(story.id, story.language_code),
    'first_published_at', story.first_published_at,
    'updated_at', greatest(story.updated_at, story.last_chapter_published_at),
    'editions', public.story_public_editions(story),
    'chapter', chapter_part);
end;
$$;
comment on function public.get_link_preview(text, text) is
  'S1-E4-04, S1-E11-36, CALM-9s: a story''s public details for link previews, search tags and the story footer, the same for every rating; never the user ID, an age or chapter text.';

/**
 * The story's genre for its footer sentence: its first approved, staff-recommended tag, in the
 * story's language (the tag's own name otherwise).
 * Inputs: the story's ID and language. Returns: the name, or null when no tag is recommended.
 * Errors: none. Where it fits: get_link_preview() only (CALM-9s).
 */
create or replace function public.story_genre_name(target_story_id uuid, story_language text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
           (select tag_names.name from public.tag_names
            where tag_names.tag_id = tags.id and tag_names.language_code = story_language
            limit 1),
           tags.name)
  from public.story_tags
  join public.tags on tags.id = story_tags.tag_id
  where story_tags.story_id = target_story_id
    and tags.status = 'approved' and tags.is_recommended
  order by story_tags.created_at, tags.name
  limit 1;
$$;
comment on function public.story_genre_name(uuid, text) is
  'CALM-9s: a story''s first approved recommended tag in its language, the genre in its footer sentence.';
-- Only get_link_preview() calls it; nobody calls it straight from the app.
revoke all on function public.story_genre_name(uuid, text) from public, anon, authenticated;

/**
 * The story's public language editions, for hreflang links (TRANSLATE-1; CALM-9s): every edition
 * of its family that is public, not class-only and readable, the first edition first.
 * Inputs: one edition. Returns: a JSON array of { slug, language_code }; empty for a story in one
 * language. Errors: none. Where it fits: get_link_preview() only.
 */
create or replace function public.story_public_editions(edition public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('slug', family.slug, 'language_code', family.language_code)
              order by family.edition_of_story_id nulls first, family.created_at),
    '[]'::jsonb)
  from public.stories as family
  where coalesce(family.edition_of_story_id, family.id)
          = coalesce(edition.edition_of_story_id, edition.id)
    and family.visibility = 'public' and not family.class_only
    and public.edition_is_readable(family)
    -- A story in one language has no alternates.
    and exists (select 1 from public.stories as other
                where coalesce(other.edition_of_story_id, other.id)
                        = coalesce(edition.edition_of_story_id, edition.id)
                  and other.id <> edition.id and other.deleted_at is null);
$$;
comment on function public.story_public_editions(public.stories) is
  'CALM-9s: a story family''s public readable editions (slug and language) for hreflang links.';
-- Only get_link_preview() calls it; nobody calls it straight from the app.
revoke all on function public.story_public_editions(public.stories) from public, anon, authenticated;


/**
 * The sitemap leaves out a story hidden in any country (CALM-9s), as its page now carries noindex:
 * search engines list pages worldwide, so the page would show where the writer hid it.
 * Otherwise unchanged from S1-E11-38.
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
  )
  limit 50000;
$$;


