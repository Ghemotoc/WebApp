/*
 * Migration: picture links show the picture in chat previews (bundle IDEAS-2, part f; idea
 * IDEA-20261101-12, approved by Robert on 2 Nov 2026, 22:00).
 *
 * A link to a picture in a chapter (/s/<story>/<chapter>/p3, S1-E4-11) used to preview with the
 * picture's alt text and the cover colour. Now its preview shows the picture itself, but only
 * when get_shared_passage() would share that picture: the story is under 16+, the writer's
 * "Sharing pictures" switch is on, and the picture's check has passed (CLAUDE.md rule 19). A
 * picture still in its check, removed or hidden gives no picture, and the preview keeps the cover
 * colour as before (criterion 2).
 * get_shared_picture() says where the file is. The address that chat apps fetch is our own
 * (/api/picture-preview/…, server/picture-preview.ts), which asks this function again on every
 * fetch and reads the file as a visitor through the existing chapter_images_select_visible
 * policy, so a picture removed later stops showing. The path is "<chapter ID>/<random ID>.<type>"
 * (S1-E3-09), never a user ID, and it is the same path a reader's signed address already holds.
 * No new table, policy or personal data.
 * Tests: supabase/tests/database/283-picture-previews.test.sql.
 */

/**
 * get_shared_picture: the picture a shared link points to, for its link preview (IDEAS-2 idea
 *   12). Anyone may ask (chat apps aren't logged in).
 * Inputs: story_slug, chapter_code, block_number (the spot, p3 → 3).
 * Returns: {bucket, path, alt} for a block that is only a chapter picture and that
 *   get_shared_passage() shares as a picture; null otherwise (16+ and 18+ stories, the writer's
 *   picture switch off, a picture still in its check or removed, text, or no such block).
 * Flow: server/link-preview.ts (og:image) and server/picture-preview.ts (the file) → this.
 */
create or replace function public.get_shared_picture(
  story_slug text,
  chapter_code text,
  block_number integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shared jsonb;
  story public.stories;
  chapter public.chapters;
  picture_block text;
  picture public.picture_checks;
begin
  -- Step 1: only what the shared passage itself would show as a picture (all its checks).
  shared := public.get_shared_passage(story_slug, chapter_code, block_number, block_number);
  if shared is null or jsonb_array_length(shared -> 'blocks') <> 1
     or (shared -> 'blocks' -> 0 ->> 'kind') <> 'picture' then
    return null;
  end if;
  -- Step 2: the picture that block names, checked again as the writer's own visible picture.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  select * into chapter from public.chapters where chapters.story_id = story.id and chapters.code = chapter_code;
  select blocks.block_text into picture_block
  from public.chapter_blocks(chapter.published_body) as blocks
  where blocks.block_number = get_shared_picture.block_number;
  select picture_checks.* into picture
  from public.chapter_picture_references(picture_block) as reference
  join public.picture_checks on picture_checks.id = reference.picture_id
  where picture_checks.user_id = story.user_id and picture_checks.bucket = 'chapter-images'
    and picture_checks.deleted_at is null
    and (public.picture_state_json(picture_checks) ->> 'state') = 'visible'
  limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object('bucket', picture.bucket, 'path', picture.path,
    'alt', shared -> 'blocks' -> 0 ->> 'alt');
end;
$$;
comment on function public.get_shared_picture(text, text, integer) is
  'The passed picture a shared link points to, for its link preview; null unless it may be shared (IDEAS-2f).';
revoke execute on function public.get_shared_picture(text, text, integer) from public;
grant execute on function public.get_shared_picture(text, text, integer) to anon, authenticated;
