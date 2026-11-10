/**
 * GAPS-5: a writer reads every comment on their chapters in one place.
 *
 * Why: the board Write draws "See all comments" beside "Latest on your chapters". The dashboard
 * answered only the newest three (writer_latest_comments(), S1-E3-07), so the link had no page
 * to open. Robert, 10 Nov 2026: where a board asks for something the data does not support,
 * create the data.
 *
 * What changes:
 *   my_chapter_comments()   new: the comments readers wrote under the caller's published
 *                           chapters, newest first, a page at a time, for one story or all
 *
 * The comments are the public ones the writer can already read under each chapter, with the same
 * rules as the dashboard's cards (comment_is_shown_to_caller(): deleted, blocked and moderated
 * comments are left out), and never the writer's own. No new table, column or policy; no user ID
 * in the answer (rule 15).
 */

/**
 * my_chapter_comments: one page of the comments on the caller's published chapters.
 *
 * Inputs: older_than, the created_at of the oldest comment shown so far (null for the first
 *   page); only_story_slug, one of the caller's stories or null for all; page_size (1 to 50,
 *   20 when left out).
 * Returns: { stories: [{ slug, title }] (the caller's stories with a published chapter, by title,
 *   for the filter), has_more, comments: [{ display_name, handle, story_slug, story_title,
 *   chapter_code, chapter_position, body (the first 600 characters), is_shortened, created_at }] }.
 *   A story that isn't the caller's simply has no comments here.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: /write/comments (features/writing/hooks/useMyChapterComments.ts), opened from
 *   "See all comments" on the Write page.
 */
create function public.my_chapter_comments(
  older_than timestamptz default null,
  only_story_slug text default null,
  page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  wanted_rows integer := least(greatest(coalesce(page_size, 20), 1), 50);
  page jsonb;
  found_rows integer;
begin
  -- Step 1: a signed-in writer.
  if caller_id is null then
    raise exception 'Log in to see the comments on your chapters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: one page and one row more, to know whether older comments are left.
  select coalesce(jsonb_agg(listed.item order by listed.created_at desc, listed.id)
                    filter (where listed.place <= wanted_rows), '[]'::jsonb),
         count(*)
  into page, found_rows
  from (
    select comments.created_at, comments.id,
      row_number() over (order by comments.created_at desc, comments.id) as place,
      jsonb_build_object(
        'display_name', public.display_name(profiles.handle, profiles.pen_name),
        'handle', profiles.handle,
        'story_slug', stories.slug,
        'story_title', stories.title,
        'chapter_code', chapters.code,
        'chapter_position', chapters.position,
        'body', left(comments.body, 600),
        'is_shortened', char_length(comments.body) > 600,
        'created_at', comments.created_at) as item
    from public.comments
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    join public.profiles on profiles.id = comments.user_id
    where stories.user_id = caller_id and stories.deleted_at is null and chapters.deleted_at is null
      and chapters.status = 'published' and comments.user_id <> caller_id
      and (only_story_slug is null or stories.slug = only_story_slug)
      and (older_than is null or comments.created_at < older_than)
      and public.comment_is_shown_to_caller(comments)
    order by comments.created_at desc, comments.id
    limit wanted_rows + 1
  ) as listed;
  -- Step 3: the page, with the stories to pick from.
  return jsonb_build_object(
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', stories.slug, 'title', stories.title)
               order by lower(stories.title), stories.created_at)
      from public.stories
      where stories.user_id = caller_id and stories.deleted_at is null
        and exists (select 1 from public.chapters
                    where chapters.story_id = stories.id and chapters.deleted_at is null
                      and chapters.status = 'published')), '[]'::jsonb),
    'has_more', found_rows > wanted_rows,
    'comments', page);
end;
$$;

comment on function public.my_chapter_comments(timestamptz, text, integer) is
  'One page of the comments readers wrote under the caller''s published chapters, newest first (GAPS-5; S1-E3-07).';

revoke all on function public.my_chapter_comments(timestamptz, text, integer) from public;
grant execute on function public.my_chapter_comments(timestamptz, text, integer) to authenticated;
