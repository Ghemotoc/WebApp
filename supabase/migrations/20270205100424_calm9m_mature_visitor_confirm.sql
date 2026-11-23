/*
 * CALM-9m: 18+ stories for visitors who aren't logged in (Robert, 23 Nov 2026, 09:04 UTC;
 * build doc "Build: CALM-9 page by page", part 1, section 2, and board B01).
 *
 * What changes and why:
 * - An 18+ story stays showable, findable and indexable: a visitor who isn't logged in now opens
 *   its story page like any other story's (until now 16+ and 18+ showed only "No preview").
 * - The chapter text waits behind one question: the visitor says they are 18 or over and want
 *   to see it. The app keeps that answer in the visitor's own browser and sends it with each
 *   request as the X-Visitor-Adult header; nothing is stored here.
 * - Signed-in members keep rating_allows() unchanged, so an under-18 account never sees an 18+
 *   story, and 16+ is unchanged for everyone (visitors still count as under 16, Q6).
 * - Lists, search and shelves keep leaving 18+ out for visitors (the usual mature filter): only
 *   the story page and the reader change.
 *
 * Who calls it: get_story_page(), get_chapter() and every other reader path through
 * reader_visible_story(). The app sends the header from src/lib/visitorAdult.ts.
 */

/**
 * visitor_said_adult: whether a visitor who isn't logged in said, in this browser, that they are
 * 18 or over (CALM-9m).
 *
 * Inputs: none; reads the X-Visitor-Adult request header ("yes").
 * Returns: true only for a visitor (no account) whose app sent "yes"; always false when signed in,
 *   because a member's own age decides (rating_allows()). Raises nothing. Never stored or logged.
 * Where it fits: get_chapter(), which sends an 18+ chapter's text to a visitor only after it.
 */
create or replace function public.visitor_said_adult()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is null
    and coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-visitor-adult', '') = 'yes';
$$;

comment on function public.visitor_said_adult() is
  'Internal: a visitor said in this browser they are 18 or over (X-Visitor-Adult header; CALM-9m).';
revoke all on function public.visitor_said_adult() from public;

/**
 * visitor_may_open_rating: whether the caller may open a story page with this rating.
 *
 * Inputs: the story's rating.
 * Returns: rating_allows() for members; for a visitor who isn't logged in, also true for 18+
 *   (the page opens and the text waits for their answer, CALM-9m). 16+ stays closed to visitors.
 * Raises nothing.
 * Where it fits: reader_visible_story_anywhere(), so the story page, the reader and the chapter
 *   list follow one rule.
 */
create or replace function public.visitor_may_open_rating(story_rating public.story_rating)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rating_allows(story_rating)
    or (story_rating = '18_plus' and (select auth.uid()) is null);
$$;

comment on function public.visitor_may_open_rating(public.story_rating) is
  'Internal: rating_allows(), plus 18+ story pages for visitors who aren''t logged in (CALM-9m).';
revoke all on function public.visitor_may_open_rating(public.story_rating) from public;

/**
 * reader_visible_story_anywhere: the story behind an address when the caller may read it, leaving
 * the country out (the rules of S1-E4-01a, S1-E8-11, NEW-1, S1-E11-08, CLAUDE.md rules 6 and 18).
 * CALM-9m: a visitor who isn't logged in also opens an 18+ story (visitor_may_open_rating()).
 *
 * Inputs: the story's address. Returns: the story as the caller may see it, or no row.
 * Where it fits: reader_visible_story() and story_unavailable_here().
 */
create or replace function public.reader_visible_story_anywhere(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select shown.* from public.stories
  cross join lateral public.story_as_shown(stories) as shown
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
    and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
    -- NEW-1: a private story opens only for its writer; an unlisted one for anyone with the link.
    and public.story_visibility_allows(stories.visibility, stories.user_id)
    and (
      stories.user_id = (select auth.uid())
      or (public.visitor_may_open_rating(stories.rating)
        and not public.is_blocked_with(stories.user_id))
    );
$$;

comment on function public.reader_visible_story_anywhere(text) is
  'Internal: the story behind an address when the caller may read it, the country aside (S1-E4-01a, COUNTRY-1, CALM-9m).';
revoke all on function public.reader_visible_story_anywhere(text) from public;

/**
 * One chapter for the reader page (S1-E4-01 and later; as in CALM-6, with CALM-9m's question).
 * What it does: finds the story and the chapter, works out the chapter's place in the story and
 * sends the text (all of it signed in, the teaser signed out, none while "In the app only").
 * CALM-9m: an 18+ chapter sends a visitor no text until they say they are 18 or over
 *   (`needs_adult_answer`, visitor_said_adult()).
 * New here: in a later language edition the place and the arrows follow the first edition's
 * chapters, `editions` gives the "Read in" switch each edition's address for this same chapter,
 * and a chapter of the first edition asked for under a later edition's address answers with the
 * translation when there is one, or with `missing_translation` when there isn't.
 * Inputs: the story's slug (any edition); the chapter's code.
 * Returns: the chapter as JSON; or {missing_translation: true, story, number, total, original,
 * translated_through, translator_name, previous_code, previous_number, editions} for a chapter this edition doesn't have yet; or null
 * when the story or chapter doesn't exist or this caller may not read it.
 * Errors: none.
 * Where it fits: src/features/reading/ reader page.
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
  if app_only or awaits_adult_answer then
    text_to_send := '';
  elsif caller_id is not null then
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
    'needs_sign_in', caller_id is null and not app_only,
    'is_teaser', caller_id is null and not app_only and not awaits_adult_answer,
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
 * get_story_page: the public story page, or null when the reader may not see it; never the user
 * ID (S1-E3-05, ADR 0004). COUNTRY-1 adds: null in a country where the story is hidden.
 *
 * CALM-9m: a visitor who isn't logged in opens an 18+ story's page too.
 *
 * Inputs: the story's address. Returns: the page's JSON, or null.
 * Where it fits: StoryPage through useStoryPage; on null the page asks story_unavailable_here().
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;
  -- S1-E11-08: a hidden title or cover is masked for readers.
  story := public.story_as_shown(story);

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    -- CALM-9m: a visitor who isn't logged in also opens an 18+ story's page.
    if not public.visitor_may_open_rating(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
    -- COUNTRY-1: nor in a country where the writer (or staff, for a classic) hid it.
    if public.story_hidden_here(story.hidden_in_countries, story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
    'completion_status', story.completion_status,
    -- CALM-6: "of N" only while a last chapter is marked, and the next scheduled chapter.
    'last_chapter_number', public.story_last_chapter_number(story.id),
    'next_chapter', public.next_chapter_json(story.id),
    'comments_enabled', story.comments_enabled,
    -- CALM-8: the end of a running pause of new comments; null when none runs or it has passed.
    'comments_paused_until', public.running_comment_pause(story),
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', story.cover_style, 'title_font', story.cover_title_font),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', public.bio_for_caller(profiles),
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    -- TRANSLATE-1a: a reader of a later edition sees every chapter of the story, in order.
    'chapters', case when story.edition_of_story_id is not null and not is_owner
      then public.edition_page_chapters(story.id, story.edition_of_story_id)
      else public.story_page_chapters(story.id, is_owner) end,
    'editions', public.story_editions_json(story),
    'edition', public.story_edition_json(story),
    'is_owner', is_owner,
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;
