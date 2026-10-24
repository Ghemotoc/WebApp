/*
 * Migration: the web teaser and link previews (story S1-E4-04; board 3.8).
 *
 * What it adds:
 * - The setting teaser_length (600 words; decided 23 Oct 2026). S1-E11-03 gives staff a screen to
 *   change it after March; until then a new migration changes it.
 * - teaser_of(chapter_body, word_limit): the first whole paragraphs of a chapter up to the limit,
 *   cut on the server so the rest of the text never reaches a signed-out browser.
 * - get_chapter(): as in S1-E4-01a, but a signed-out visitor now gets the teaser instead of no
 *   text, with is_teaser and text_continues. Signed-out visitors count as under 16 (decided
 *   23 Oct 2026, Q6), so rating_allows() already keeps 16+ and 18+ stories from them: they get
 *   null, as before, and no teaser.
 * - get_link_preview(story_slug, chapter_code): what a link preview and the "No preview" notice
 *   may show about a story to someone who isn't logged in. For All ages and 13+: the title,
 *   blurb, pen name, cover and chapter title. For 16+ and 18+: the title and the rating only, no
 *   text and nothing written on a cover beyond the title (S1-E4-04 criterion). Never the user ID
 *   and never chapter text.
 * Who calls it: src/features/reading/api/chapter.ts and api/linkPreview.ts (the reader and the
 *   story page), and the Pages Function for /s/… (functions/s/[[path]].ts through
 *   server/link-preview.ts), which puts the preview in the page's Open Graph tags.
 * Tests: supabase/tests/database/142-teaser.test.sql.
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('teaser_length', '600'::jsonb, true,
   'How many words of a chapter a signed-out visitor reads before the sign-up prompt, in whole paragraphs (S1-E4-04; decided 23 Oct 2026).');

/* ---------- Text helpers ---------- */

/**
 * word_total: how many words a text has, counting anything between spaces or line breaks.
 * Input: any text. Returns: the count (0 for empty or null text). Errors: none.
 * Where it fits: teaser_of() and get_chapter(), to know whether the teaser is the whole chapter.
 */
create or replace function public.word_total(any_text text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(any_text, ''), E' \t\n\r') = '' then 0
    else coalesce(array_length(regexp_split_to_array(btrim(any_text, E' \t\n\r'), E'\\s+'), 1), 0)
  end;
$$;

comment on function public.word_total(text) is
  'How many words a text has (S1-E4-04).';
revoke execute on function public.word_total(text) from public, anon, authenticated;

/**
 * teaser_of: the start of a chapter for a signed-out visitor.
 * Inputs: chapter_body (the Markdown subset, ADR 0005, paragraphs separated by a blank line) and
 *   word_limit. Returns: whole paragraphs from the top, as many as fit in word_limit words; when
 *   the first paragraph alone is longer, its first word_limit words followed by "…", so there is
 *   always something to read. A chapter shorter than the limit comes back whole.
 * Errors: none.
 * Where it fits: get_chapter() for signed-out visitors. Cutting here, on the server, means the
 *   rest of the text never reaches their browser (S1-E4-04).
 */
create or replace function public.teaser_of(chapter_body text, word_limit integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  paragraphs text[] := regexp_split_to_array(btrim(coalesce(chapter_body, ''), E' \t\n\r'), E'\n[ \t]*\n');
  paragraph text;
  paragraph_words integer;
  words_so_far integer := 0;
  kept text[] := '{}';
  first_words text[];
begin
  foreach paragraph in array paragraphs loop
    paragraph_words := public.word_total(paragraph);
    -- Step 1: skip empty blocks (several blank lines in a row).
    if paragraph_words = 0 then
      continue;
    end if;
    -- Step 2: keep the whole paragraph while it still fits.
    if words_so_far + paragraph_words <= word_limit then
      kept := kept || btrim(paragraph, E' \t\n\r');
      words_so_far := words_so_far + paragraph_words;
      continue;
    end if;
    -- Step 3: the first paragraph alone is too long: cut it at the limit and mark the cut.
    if words_so_far = 0 then
      first_words := regexp_split_to_array(btrim(paragraph, E' \t\n\r'), E'\\s+');
      kept := kept || (array_to_string(first_words[1:word_limit], ' ') || '…');
    end if;
    -- Step 4: stop at the first paragraph that doesn't fit.
    exit;
  end loop;
  return array_to_string(kept, E'\n\n');
end;
$$;

comment on function public.teaser_of(text, integer) is
  'The first whole paragraphs of a chapter up to a word limit, for signed-out visitors (S1-E4-04).';
revoke execute on function public.teaser_of(text, integer) from public, anon, authenticated;

/* ---------- get_chapter() with the teaser ---------- */

/**
 * get_chapter: one chapter as readers see it (screen 3.5; the teaser, screen 3.8).
 * Inputs: story_slug, chapter_code. Returns: JSON with the story's address, title, language and
 *   writer (pen name or username, never the user ID), the chapter's title, its number among the
 *   readable chapters and how many there are, the previous and next chapters' codes, the first
 *   published and edited dates, the minutes to read the whole chapter (200 words a minute, at
 *   least 1; a proposal) and the text. A signed-in reader gets the whole published text. A
 *   signed-out visitor gets only the teaser (teaser_of() with the teaser_length setting), with
 *   is_teaser true and text_continues telling whether the chapter goes on after it. Null when
 *   the reader may not see it; for signed-out visitors that includes every 16+ and 18+ story
 *   (they count as under 16, Q6), which get_link_preview() explains instead.
 * Errors: none; an unknown address answers null.
 * Where it fits: the reader screen's only call (src/features/reading/api/chapter.ts).
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
  chapter public.chapters;
  readable_codes text[];
  place integer;
  text_to_send text;
  teaser_words integer;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  -- Step 2: the chapter, published and not moderated away.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if not found or not public.chapter_is_readable(chapter.id) then
    return null;
  end if;
  -- Step 3: its place among the chapters readers can open, for "Chapter n of N" and the arrows.
  select array_agg(others.code order by others.position) into readable_codes
  from public.chapters as others
  where others.story_id = story.id and public.chapter_is_readable(others.id);
  place := array_position(readable_codes, chapter.code);
  -- Step 4: the text: all of it for a signed-in reader, the teaser for a signed-out visitor.
  if caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;
  -- Step 5: the answer.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.display_name(profiles.handle, profiles.pen_name),
          'handle', profiles.handle)
        from public.profiles where profiles.id = story.user_id)),
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(readable_codes, 1),
    'previous_code', case when place > 1 then readable_codes[place - 1] end,
    'next_code', readable_codes[place + 1],
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null,
    'is_teaser', caller_id is null,
    'text_continues', public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send);
end;
$$;

comment on function public.get_chapter(text, text) is
  'A chapter as readers see it, the teaser for signed-out visitors; null when the reader may not (rating, blocks, deleted, moderated, unpublished) (S1-E4-01a, S1-E4-04).';
revoke execute on function public.get_chapter(text, text) from public;
grant execute on function public.get_chapter(text, text) to anon, authenticated;

/* ---------- get_link_preview() ---------- */

/**
 * get_link_preview: what a link preview may show about a story to someone who isn't logged in.
 * Inputs: story_slug; chapter_code, or null for the story's own page. Returns: JSON with slug,
 *   title, rating, language_code, hides_text and, only when hides_text is false, blurb, writer
 *   (pen name or username), cover (kind, design and colours) and chapter (code and title).
 *   hides_text is true for 16+ and 18+: signed-out visitors count as under 16 (Q6), so they get
 *   the title and the rating and nothing else (S1-E4-04). The answer is the same whoever asks,
 *   because it describes the public preview, not the caller's own view. Never the user ID and
 *   never chapter text. Null for an unknown, deleted, unpublished or moderated story, or a
 *   chapter that isn't readable.
 * Errors: none.
 * Where it fits: the Pages Function for /s/… (Open Graph tags, JSON-LD, noindex) and the
 *   "No preview for this story" notice (src/features/reading/api/linkPreview.ts).
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
  hides_text boolean;
  chapter_part jsonb;
begin
  -- Step 1: a live story with at least one chapter published once, not hidden by a moderator.
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or public.is_moderated_away('story', story.id) then
    return null;
  end if;
  -- Step 2: 16+ and 18+ show nothing beyond the title to visitors who aren't logged in (Q6).
  hides_text := story.rating in ('16_plus', '18_plus');
  -- Step 3: the chapter, when the address names one; it must be readable.
  if chapter_code is not null then
    select * into chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = story.id;
    if not found or not public.chapter_is_readable(chapter.id) then
      return null;
    end if;
    chapter_part := jsonb_build_object('code', chapter.code,
      'title', case when hides_text then null else chapter.published_title end);
  end if;
  -- Step 4: the preview, with the writer's pen name or username and never the user ID.
  return jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'rating', story.rating,
    'language_code', story.language_code,
    'hides_text', hides_text,
    'blurb', case when hides_text then null else story.blurb end,
    'writer', case when hides_text then null else (
      select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name))
      from public.profiles where profiles.id = story.user_id) end,
    'cover', case when hides_text then null else jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent) end,
    'chapter', chapter_part);
end;
$$;

comment on function public.get_link_preview(text, text) is
  'What a link preview may show a visitor who is not logged in: title and rating always, the rest only for All ages and 13+ (S1-E4-04).';
revoke execute on function public.get_link_preview(text, text) from public;
grant execute on function public.get_link_preview(text, text) to anon, authenticated;
