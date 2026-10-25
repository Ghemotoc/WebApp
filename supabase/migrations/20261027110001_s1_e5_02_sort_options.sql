/*
 * Migration: the reader's sort choices on every story list (story S1-E5-02; board 3.10, "Sort
 * by").
 *
 * What it changes: browse_stories() (S1-E5-01) now takes every sort the list page offers:
 * - updated: recently updated (a new chapter), the default for most lists;
 * - newest and oldest: by when the story was first published (newest is the 'new' list's own);
 * - title_az and title_za: by title in Romanian alphabetical order (a, ă, â, b … ș, t, ț …),
 *   with the ICU Romanian collation, so "Ăla" comes after "Ana" and "Șase" after "Sapte";
 * - writer: by the writer's display name (pen name, or the username), in the same order.
 * Ties always go to the newer story, then the address, so pages never overlap.
 * Popular (the default once ranking exists) comes with S1-E5-03 in PEOPLE-3 (decided in
 * pr-drafts/PEOPLE-2-plan.md).
 * No new table and no new policy.
 * Who calls it: src/features/discovery/api/storyLists.ts.
 * Tests: supabase/tests/database/152-story-list-sorts.test.sql.
 */

/**
 * browse_stories: one page of a story list and how many it holds.
 * Inputs: as in S1-E5-01; sort_order is now one of updated, newest, oldest, title_az, title_za or
 *   writer (null for the list's own order: newest for 'new', updated for the rest).
 * Returns: JSON {total, stories: [story_card_json(), ...]}.
 * Errors: invalid_parameter_value for an unknown list_kind or sort_order, a missing list_key, or a
 *   negative page_offset.
 * Where it fits: every shelf on Discover and every See all page (src/features/discovery/).
 */
create or replace function public.browse_stories(
  list_kind text,
  list_key text default null,
  category_slug text default null,
  completion public.completion_status default null,
  language text default null,
  sort_order text default null,
  page_size integer default 21,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, case when list_kind = 'new' then 'newest' else 'updated' end);
  total integer;
  page jsonb;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or list_kind not in ('updated', 'new', 'completed', 'category', 'tag', 'following', 'writer') then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: how many the list holds for this reader, for "24 stories" and "View all 24".
  select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  -- Step 3: the page, in the chosen order. Only one of the sort lines below is switched on (the
  -- others are null for every row); the last two lines break ties: the newer story, then the
  -- address, so pages never overlap.
  select coalesce(jsonb_agg(public.story_card_json(ordered.id) order by ordered.position), '[]'::jsonb) into page
  from (
    select listed.id, row_number() over (order by
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    join public.profiles on profiles.id = listed.user_id
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;
comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer) is
  'One page of a story list (Discover shelves, category, tag and See all pages) with its total, in the reader''s sort (S1-E5-01, S1-E5-02).';
