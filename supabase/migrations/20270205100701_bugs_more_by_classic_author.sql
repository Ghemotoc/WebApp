-- BUGS (Robert, 26 Nov 2026): "More by" beside a classic matches its real author.
--
-- What it is for: every public-domain classic is published by the one official classics account,
-- so more_by_writer() (S1-E15-06), which matched stories on their owner (stories.user_id), put
-- Creangă, Caragiale and Eminescu under "More by Charles Dickens". A classic's byline is its real
-- author (stories.classic_author_id, S1-E5-06), so the row now matches on that instead.
-- Who calls it: the story page and the end of the latest chapter (useStorySuggestions).
-- What it calls next: visible_story_by_slug(), listed_stories(), story_card_json().
--
-- The rule, in plain words:
-- - beside a classic, "More by" lists other classics by the same real author, whoever loaded them;
-- - beside a writer's own story, it lists the writer's other own stories, never a classic;
-- - an author with no other works gets an empty list, and the page hides an empty row
--   (StorySuggestions shows nothing for a row without stories).

/**
 * more_by_writer: "More by <writer>", the other stories with the same byline the caller may see.
 * Input: story_slug, the story the row is shown beside.
 * Returns: {stories: [story cards]}, most popular first. For a classic, the same real author's other
 *   classics; for a writer's own story, the writer's other own stories. No stories for a story the
 *   caller may not see, so the row can't reveal one (S1-E15-06, criterion 1).
 * Errors: none. Where it fits: the story page and the end of the latest chapter
 *   (useStorySuggestions).
 */
create or replace function public.more_by_writer(story_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  -- Step 1: the story the row sits beside, only when the caller may see it, with its real author
  -- (null for a writer's own story).
  with shown_beside as (
    select visible.story_id, visible.writer_id, stories.classic_author_id
    from public.visible_story_by_slug(story_slug) as visible
    join public.stories on stories.id = visible.story_id
  ),
  -- Step 2: the other listed stories with the same byline, most popular first.
  others as (
    select listed.id, coalesce(scores.score, 0) as score, listed.first_published_at
    from public.listed_stories('popular', null, null, null, null) as listed
    join public.stories as other_story on other_story.id = listed.id
    join shown_beside on listed.id <> shown_beside.story_id
      and (
        -- A classic: the same real author, whichever account published it.
        (shown_beside.classic_author_id is not null
          and other_story.classic_author_id = shown_beside.classic_author_id)
        -- A writer's own story: the same writer's own stories, never a classic.
        or (shown_beside.classic_author_id is null
          and other_story.classic_author_id is null
          and listed.user_id = shown_beside.writer_id)
      )
    left join public.story_scores as scores on scores.story_id = listed.id
    order by score desc, listed.first_published_at desc nulls last
    limit public.suggestion_row_size()
  )
  -- Step 3: the cards, in the same order.
  select jsonb_build_object('stories', coalesce(
    (select jsonb_agg(public.story_card_json(others.id) order by others.score desc,
                      others.first_published_at desc nulls last) from others), '[]'::jsonb));
$$;
comment on function public.more_by_writer(text) is
  'More by: the other stories with the same byline the caller may see (a classic''s real author, or the writer), most popular first (S1-E15-06; BUGS, 26 Nov 2026).';
revoke execute on function public.more_by_writer(text) from public;
grant execute on function public.more_by_writer(text) to anon, authenticated;
