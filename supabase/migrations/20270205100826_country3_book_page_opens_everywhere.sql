-- COUNTRY-3: the book page opens in every country (Robert, 28 Nov 2026).
--
-- Robert picked "Index the book page, not its text" for a book hidden in some countries (COUNTRY-1,
-- COUNTRY-2). Until now get_story_page() answered nothing in such a country, so a reader there (or
-- Google crawling from there) saw only "Sorry, this book isn't available in your country". Now the
-- book page answers everywhere and says 'unavailable_here'; the screen puts the notice in place of
-- the read button, and every chapter keeps refusing its text through get_chapter(), unchanged.
--
-- What changes: get_story_page() only. Story lists keep hiding the story in
-- those countries (COUNTRY-1), and story_unavailable_here() stays for a chapter
-- that doesn't open.

/**
 * get_story_page: as before (BOOKS-B2 and everything earlier), except that a story hidden in the
 * reader's country now still answers: its page (title, author, blurb, cover, labels and the chapter
 * list) opens everywhere, with 'unavailable_here' true, and only the chapter text is refused,
 * by get_chapter() through reader_visible_story() as before (COUNTRY-3; Robert's card answer
 * "Index the book page, not its text", 28 Nov 2026).
 * Input: story_slug. Returns: the page as JSON, or null when the reader may not see it.
 * Errors: none of its own.
 * Where it fits: StoryPage through useStoryPage; the page swaps its read button for "Sorry, this
 * book isn't available in your country" when 'unavailable_here' is true.
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
    -- COUNTRY-3: a story hidden in the reader's country (COUNTRY-1) still answers here, so the
    -- book page opens and search engines read it; 'unavailable_here' below tells the page to
    -- refuse the chapters, which get_chapter() refuses anyway.
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
    -- COUNTRY-3: true when the story is hidden in the reader's country; never for the owner.
    'unavailable_here', not is_owner
      and public.story_hidden_here(story.hidden_in_countries, story.user_id),
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      -- BOOKS-B2 (board B01, Robert's "As drawn on the canvas", 24 Nov 2026): the reads total is
      -- public, and the likes are the story's own Likes (story_likes), not its chapters'.
      'reads', public.story_read_total(story.id),
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;
comment on function public.get_story_page(text) is
  'The public story page, or null when the reader may not see it; in a country where the story is hidden it still answers, with unavailable_here (COUNTRY-3); never the user ID (S1-E3-05, ADR 0004).';
