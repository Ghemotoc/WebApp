/**
 * S1-E11-36 (bundle SEO-1a): every story's search and share details, whatever its rating.
 *
 * Robert, 11 Nov 2026, 08:35 to 08:39: a story page's search details are only the story's own
 * title, the pen name (or username), the blurb, the category (genre) and the tags; writers fill
 * nothing extra. Every story is treated the same: the rating decides only who can open it once
 * signed in, and the rating itself is never shown in a preview or a search result. This replaces
 * the S1-E4-04 rule (Q6) that a 16+ or 18+ preview showed the title and the rating only.
 *
 * What changes: get_link_preview() now gives the blurb, the writer's name, the cover colour and the
 * chapter title for every rating, plus two new fields, `category_slug` and `tags`. What stays:
 * `hides_text` is still true for 16+ and 18+, because visitors who aren't logged in count as under
 * 16 (Q6) and so never see the story's text: no teaser, no shared passage, no shared picture.
 * Who calls it: server/link-preview.ts (shared links' Open Graph tags and search engine tags) and
 * src/features/reading/api/storyPreview.ts (the "No preview for this story" notice).
 */

/**
 * story_search_tags: the approved tags of one story, as names in the story's language where a tag
 * has one (tag_names), otherwise the tag's own name; at most ten, in the order they were added.
 *
 * @param target_story_id - the story
 * @param story_language - the story's language code, for the tag's translated name
 * @returns a JSON array of names; an empty array when the story has none
 * Where it fits: get_link_preview() puts it in the preview's `tags`, for the description's keywords
 * and the structured data. Waiting and refused tags never show (S1-E3-01).
 */
create or replace function public.story_search_tags(target_story_id uuid, story_language text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(chosen.name order by chosen.added_at), '[]'::jsonb)
  from (
    select coalesce(
             (select tag_names.name from public.tag_names
              where tag_names.tag_id = tags.id and tag_names.language_code = story_language
              limit 1),
             tags.name) as name,
           story_tags.created_at as added_at
    from public.story_tags
    join public.tags on tags.id = story_tags.tag_id
    where story_tags.story_id = target_story_id and tags.status = 'approved'
    order by story_tags.created_at
    limit 10
  ) as chosen;
$$;

comment on function public.story_search_tags(uuid, text) is
  'S1-E11-36: a story''s approved tags in its language, at most ten, for link previews and search tags.';

-- Only get_link_preview() calls it; nobody calls it straight from the app.
revoke all on function public.story_search_tags(uuid, text) from public, anon, authenticated;

/**
 * get_link_preview: what anyone may know about a story before opening it (S1-E4-04, S1-E11-36).
 *
 * @param story_slug - the story's public address
 * @param chapter_code - a chapter's code, or null for the story page
 * @returns the title, blurb, writer's name, cover colours, category, tags, the chapter's title and
 *   `hides_text` (true for 16+ and 18+: visitors who aren't logged in never see the text, Q6);
 *   null for an unknown, deleted, unpublished or moderated-away story, or a chapter that can't be
 *   read. Never the user ID and never chapter text.
 * Where it fits: shared links' head tags (server/link-preview.ts) and the in-app notice for a story
 * a visitor can't open (storyPreview.ts).
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
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or public.is_moderated_away('story', story.id) then
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
    'blurb', story.blurb,
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name))
      from public.profiles where profiles.id = story.user_id),
    'cover', jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', public.story_search_tags(story.id, story.language_code),
    'chapter', chapter_part);
end;
$$;

comment on function public.get_link_preview(text, text) is
  'S1-E4-04, S1-E11-36: a story''s public details for link previews and search tags, the same for every rating; never the user ID or chapter text.';
