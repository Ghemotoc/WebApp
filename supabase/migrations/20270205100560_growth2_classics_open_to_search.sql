-- GROWTH-2: public-domain classics open to visitors and search engines.
--
-- Decisions: Robert, GROWTH thread (sitemap and SEO review), 26 Nov 2026. 15:11 UTC: chapters of
-- public-domain classics are readable signed out, indexable and listed in the sitemap. 15:13 UTC:
-- writers' chapters are indexable too, but visitors still see only the teaser (about 40 words).
-- Why: the classics match searches pupils make every school year, and they carry no writer's
-- rights and no member's data. A classic is a story with classic_author_id set (S1-E5-06).
--
-- 1. get_chapter(): a signed-out visitor gets a classic's whole chapter, not the teaser
--    (is_teaser and needs_sign_in are false for it). Everything else is unchanged from CALM-9m:
--    ratings, the 18+ question, "In the app only", blocks and moderation still apply first.
-- 2. sitemap_entries(): adds every readable chapter of a listed story rated All ages or 13+
--    (Robert, 26 Nov 2026, 15:13 UTC: chapters too, showing visitors "only a bit, like 40 words").
--    A classic's chapter is read whole; a writer's chapter shows the teaser and the sign-in
--    prompt. 16+ and 18+ chapters stay out: visitors get no text from them, so the page would be
--    empty. server/link-preview.ts lets the same chapters be indexed. Otherwise unchanged from
--    CALM-9s.
-- Who calls them: the reader (src/features/reading/api/chapter.ts), functions/s/[[path]].ts
-- (and functions/s/[[path]].ts for the chapter page's tags) and functions/sitemap.xml.ts through
-- server/sitemap.ts.
-- Grants are unchanged: create or replace keeps each function's existing grants.

/**
 * get_chapter: a chapter as readers see it (S1-E4-01a; CALM-9m; GROWTH-2).
 * Inputs: the story's slug and the chapter's code.
 * Returns: the chapter as JSON, the teaser for a signed-out visitor on a writer's story and the
 *   whole text on a public-domain classic; null when the reader may not open it.
 * Errors: none. Where it fits: the chapter reader.
 */
create or replace function public.get_chapter(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  first_edition public.stories;
  chapter public.chapters;
  source_chapter public.chapters;
  source_ids uuid[];
  place integer;
  earlier_place integer;
  story_json jsonb;
  editions_json jsonb;
  text_to_send text;
  teaser_words integer;
  app_only boolean;
  open_to_visitors boolean;
  awaits_adult_answer boolean;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  select * into first_edition from public.stories
  where stories.id = coalesce(story.edition_of_story_id, story.id);

  -- Step 2: the chapter, published and not moderated away. `source_chapter` is the first
  -- edition's chapter it stands for (itself, in a story with one language).
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if found and public.chapter_is_readable(chapter.id) then
    select * into source_chapter from public.chapters
    where chapters.id = coalesce(chapter.translation_of_chapter_id, chapter.id);
  elsif story.edition_of_story_id is not null then
    -- A chapter of the first edition asked for under this edition's address: the reader switched
    -- language or followed "next" onto a chapter that may not be translated yet.
    select * into source_chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = first_edition.id;
    if not found or not public.chapter_is_readable(source_chapter.id) then
      return null;
    end if;
    select * into chapter from public.chapters
    where chapters.story_id = story.id and chapters.translation_of_chapter_id = source_chapter.id
      and public.chapter_is_readable(chapters.id);
    if not found then
      chapter := null;
    end if;
  else
    return null;
  end if;

  -- Step 3: its place among the story's chapters readers can open, for "Chapter n of N" and the
  -- arrows. Every edition counts in the first edition's chapters, so the number stays the same
  -- when the reader changes language.
  select array_agg(others.id order by others.position) into source_ids
  from public.chapters as others
  where others.story_id = first_edition.id and public.chapter_is_readable(others.id);
  place := array_position(source_ids, source_chapter.id);

  story_json := jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'language_code', story.language_code,
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle,
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id));

  editions_json := public.story_editions_json(story, source_chapter.id);

  -- Step 4: this edition doesn't have the chapter yet (handoff, "A chapter that isn't translated").
  -- The answer names the original to read instead and the nearest earlier chapter this edition has.
  if chapter.id is null then
    select max(earlier.spot) into earlier_place
    from unnest(source_ids) with ordinality as earlier (source_id, spot)
    where earlier.spot < place and exists (
      select 1 from public.chapters as translations
      where translations.story_id = story.id and translations.translation_of_chapter_id = earlier.source_id
        and public.chapter_is_readable(translations.id));
    return jsonb_build_object(
      'missing_translation', true,
      'story', story_json,
      'number', place,
      'total', array_length(source_ids, 1),
      'original', jsonb_build_object(
        'slug', first_edition.slug,
        'language_code', first_edition.language_code,
        'code', source_chapter.code,
        'title', source_chapter.published_title),
      -- "Ana Vlad has translated chapters 1 to 4": the unbroken run from chapter one, and the
      -- translator of a classic (a member's story is translated by its writer).
      'translated_through', coalesce((
        select min(gaps.spot) - 1
        from unnest(source_ids) with ordinality as gaps (source_id, spot)
        where not exists (
          select 1 from public.chapters as translations
          where translations.story_id = story.id and translations.translation_of_chapter_id = gaps.source_id
            and public.chapter_is_readable(translations.id))), 0),
      -- CALM-6: "of N" only while a last chapter is marked, counted in the first edition.
      'last_chapter_number', public.story_last_chapter_number(first_edition.id),
      'translator_name', (select works.translator_name from public.classic_works as works
        where works.story_id = story.id),
      'previous_number', earlier_place,
      'previous_code', case when earlier_place is not null then
        public.edition_chapter_code(story.id, first_edition.id, source_ids[earlier_place]) end,
      'editions', editions_json);
  end if;

  -- Step 5: the text. GAPS-15: none on the web while "In the app only" applies, except for the
  -- writer; otherwise all of it for a signed-in reader and the teaser for a signed-out visitor.
  app_only := public.story_app_only_applies(story.is_app_only)
    and story.user_id is distinct from caller_id;
  -- CALM-9m (Robert, 23 Nov 2026, 09:04 UTC): a visitor opens an 18+ story's page, but its text
  -- only once they have said in this browser that they are 18 or over.
  awaits_adult_answer := caller_id is null and story.rating = '18_plus'
    and not public.visitor_said_adult();
  -- GROWTH-2 (Robert, 26 Nov 2026, 15:11 UTC): a public-domain classic is read whole by
  -- visitors too, so search engines can list its chapters; a writer's own story keeps the teaser.
  open_to_visitors := story.classic_author_id is not null;
  if app_only or awaits_adult_answer then
    text_to_send := '';
  elsif caller_id is not null or open_to_visitors then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;

  -- Step 6: the answer, with the pictures and cards in the text that is sent.
  return jsonb_build_object(
    'story', story_json,
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(source_ids, 1),
    -- CALM-6: "of N" only while a last chapter is marked (null otherwise), and the next
    -- scheduled chapter for "Next chapter Thursday". Numbers count in the first edition.
    'last_chapter_number', public.story_last_chapter_number(first_edition.id),
    'next_chapter', public.next_chapter_json(first_edition.id),
    'previous_code', case when place > 1 then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place - 1]) end,
    'next_code', case when place < array_length(source_ids, 1) then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place + 1]) end,
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null and not app_only and not open_to_visitors,
    'is_teaser', caller_id is null and not app_only and not awaits_adult_answer
      and not open_to_visitors,
    'app_only', app_only,
    -- CALM-9m: true while a visitor hasn't yet said they are 18 or over (no text is sent).
    'needs_adult_answer', awaits_adult_answer,
    -- MUST-2: a poem's lines and stanzas are drawn as written.
    'is_poem', chapter.is_poem,
    'text_continues', not app_only and not awaits_adult_answer
      and public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id),
    'embeds', public.chapter_embed_states(text_to_send, story.user_id),
    -- TRANSLATE-1a: the "Read in" switch, each language with its address for this same chapter;
    -- empty for a story in one language (Robert, 16 Nov 2026, 12:23 UTC).
    'editions', editions_json,
    -- The language the story was written in and a classic's translator, for the credit under
    -- the title; only for a story in several languages.
    'edition', case when jsonb_array_length(editions_json) > 0 then public.story_edition_json(story) end);
end;
$$;

/**
 * sitemap_entries: every address search engines may list (S1-E11-38, CALM-9s), now with the
 * chapters of listed stories visitors get text from (GROWTH-2).
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
  )
  limit 50000;
$$;
