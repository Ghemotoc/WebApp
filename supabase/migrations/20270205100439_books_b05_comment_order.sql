/*
 * BOOKS B05 (user story 2.5, board B05-ReaderEnd): comments can be read oldest first.
 *
 * The board's comments heading has a "Newest first / Oldest first" choice. chapter_comments()
 * only listed newest first, so it gains oldest_first, and its page cursor older_than becomes
 * page_after: the moment of the last comment shown, read as "older than" when newest first and
 * "newer than" when oldest first.
 *
 * What it does: drops chapter_comments(text, text, timestamptz) and makes it again as
 *   chapter_comments(story_slug, chapter_code, page_after, oldest_first) with the same body, grants
 *   and comment otherwise. Postgres can't add an argument with create or replace without leaving a
 *   second, ambiguous version behind, so the old one is dropped first.
 * Privacy: nothing new is read or shown; replies stay oldest first under their comment.
 * Who calls it: src/features/comments/api/comments.ts (fetchCommentsPage).
 * Tests: supabase/tests/database/149-comments.test.sql.
 */

drop function public.chapter_comments(text, text, timestamptz);

/*
 * chapter_comments: one page of a chapter's comments (S1-E6-01; S1-E6-06; MUST-1a; CALM-8;
 * BOOKS B05).
 * Inputs: the story's slug, the chapter's code, page_after (null for the first page, else the
 *   created_at of the last comment shown) and oldest_first (false: newest first, the default).
 * Returns: null when the caller may not read the chapter; otherwise whether comments are on, who
 *   may comment, the total, has_more and the page of comments with their replies and paragraph.
 * Errors: none of its own.
 * Flow: the chapter's comments section → this function → comments, read back as one page.
 */
create function public.chapter_comments(
  story_slug text,
  chapter_code text,
  page_after timestamptz default null,
  oldest_first boolean default false
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter public.chapters;
  story public.stories;
  page_size integer := coalesce((public.setting_value('comment_page_size'))::integer, 20);
  page jsonb;
  page_count integer;
begin
  -- Step 1: the chapter, if the caller may read it, and its story's comments switch.
  select * into chapter from public.readable_chapter(story_slug, chapter_code);
  if chapter.id is null then
    return null;
  end if;
  select * into story from public.stories where stories.id = chapter.story_id;
  if not story.comments_enabled then
    return jsonb_build_object('comments_enabled', false, 'total', 0, 'has_more', false, 'comments', '[]'::jsonb);
  end if;
  -- Step 2: one page of top-level comments (one extra, to know whether there is more), each with
  -- its replies and its paragraph; one without words shows only while it keeps replies in place.
  with listed as (
    select top_level.id from public.comments as top_level
    where top_level.chapter_id = chapter.id
      and top_level.parent_comment_id is null
      -- BOOKS B05: the next page starts after the last comment shown, in the order picked.
      and (page_after is null
           or (not oldest_first and top_level.created_at < page_after)
           or (oldest_first and top_level.created_at > page_after))
      and (public.comment_is_shown_to_caller(top_level)
           or (public.comment_state_for_caller(top_level) in ('deleted', 'removed')
               and jsonb_array_length(public.comment_replies_json(top_level.id, story.user_id)) > 0))
    -- BOOKS B05: newest first by default, oldest first when the reader picks it.
    order by case when oldest_first then top_level.created_at end asc,
             case when not oldest_first then top_level.created_at end desc
    limit page_size + 1
  )
  select coalesce(jsonb_agg(public.comment_json(comments, story.user_id)
           || jsonb_build_object('replies', public.comment_replies_json(comments.id, story.user_id),
                                 'paragraph', public.comment_paragraph_json(comments, chapter.published_body))
           order by case when oldest_first then comments.created_at end asc,
                    case when not oldest_first then comments.created_at end desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from listed join public.comments on comments.id = listed.id;
  -- Step 3: the answer; the extra comment only says there is more.
  return jsonb_build_object(
    'comments_enabled', true,
    -- MUST-1a: who may add comments, and whether that includes the caller, so the page shows
    -- the comment box or "Only the writer's followers can comment here".
    'comment_audience', story.comment_audience,
    'audience_allows_me', public.comment_audience_allows(story, (select auth.uid())),
    'total', (select count(*)::integer from public.comments
              where comments.chapter_id = chapter.id and public.comment_is_shown_to_caller(comments)),
    'has_more', page_count > page_size,
    'comments', case when page_count > page_size then page - page_size else page end)
    -- CALM-8: while new comments are paused, until when and whether the caller may end it.
    || public.comment_pause_json(story);
end;
$$;
comment on function public.chapter_comments(text, text, timestamptz, boolean) is
  'One page of a chapter''s comments, newest first or oldest first, with replies and which paragraph each is on; never a user ID (S1-E6-01, S1-E6-06, BOOKS B05).';

grant execute on function public.chapter_comments(text, text, timestamptz, boolean) to anon, authenticated;
