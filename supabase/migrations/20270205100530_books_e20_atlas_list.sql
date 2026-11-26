/*
 * books_e20_atlas_list: the Story Atlas list (/plan) as board E20 draws it.
 *
 * Story: user stories bundle 6, story 6.1 (board E20-Atlas; Robert's unattended run, 25 Nov 2026).
 * Who calls it: the migration runner. What it changes: my_story_plans(), which /plan reads.
 *
 * Why: E20 is a list, newest edit first, and each row says how far the story is out: "edited 10
 * min ago" while the writer is at it, "6 chapters out", or "not published". So each plan now
 * also carries when it was last edited (the plan, the story or any chapter, whichever is newest)
 * and how many of its chapters are published. The order uses the same newest edit, so a chapter
 * saved a minute ago brings its story to the top, as the story asks ("the newest edit comes
 * first").
 */

/**
 * my_story_plans: the caller's story plans for /plan, newest edit first.
 * Inputs: none (the caller is the writer). Returns: a JSON array of {slug, logline,
 *   writing_status, word_target, words_written, published_chapters, edited_at}.
 * Errors: insufficient_privilege when nobody is signed in.
 * Flow: AtlasHomePage → useMyStoryPlans → fetchMyStoryPlans → here.
 */
create or replace function public.my_story_plans()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in writer has plans.
  if caller_id is null then
    raise exception 'Sign in to see your plans.' using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: the caller's live stories and their plans. The words come from the chapters' own
  -- counts, the same sum the at-a-glance page shows (story_plan_chapters()); a chapter counts as
  -- out once it is published; the edit time is the newest of the plan, the story and its chapters.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'slug', listed.slug,
             'logline', listed.logline,
             'writing_status', listed.writing_status,
             'word_target', listed.word_target,
             'words_written', listed.words_written,
             'published_chapters', listed.published_chapters,
             'edited_at', listed.edited_at)
           order by listed.edited_at desc)
    from (
      select stories.slug, plans.logline, plans.writing_status, plans.word_target,
        coalesce(chapter_totals.words_written, 0) as words_written,
        coalesce(chapter_totals.published_chapters, 0) as published_chapters,
        greatest(plans.updated_at, stories.updated_at, chapter_totals.last_chapter_edit) as edited_at
      from public.stories
      join public.story_plans as plans on plans.story_id = stories.id
      left join lateral (
        select sum(chapters.word_count) as words_written,
          count(*) filter (where chapters.status = 'published') as published_chapters,
          max(chapters.updated_at) as last_chapter_edit
        from public.chapters
        where chapters.story_id = stories.id and chapters.deleted_at is null
      ) as chapter_totals on true
      where stories.user_id = caller_id and stories.deleted_at is null
    ) as listed
  ), '[]'::jsonb);
end;
$$;
comment on function public.my_story_plans() is
  'The caller''s story plans for the /plan list, newest edit first: slug, logline, writing status, word target, words written, published chapters and the last edit (G10a; bundle 6, board E20).';
