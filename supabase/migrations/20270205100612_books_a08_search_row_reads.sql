/*
 * Migration: each search result row says how many reads its story has (user story 1.8, board
 * A08-SearchResults of "Build: the full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC:
 * "ensure that there are no missing widgets between the pages from the canvas versus the one on
 * the live site").
 *
 * Why: board A08 draws each row as "pen name · reads · chapters · when it last changed". The story
 * card already carries the chapters and the last chapter's date; the reads total is public on the
 * story page (story_read_total(), BOOKS-B2, Robert's "As drawn on the canvas", 24 Nov 2026) but
 * wasn't on the card (docs/board-fixes.md).
 * What it changes:
 * - story_list_row_extras(): the fields a list adds to its cards, today the reads for a search;
 * - browse_stories() adds them to each card. Everything else is as in
 *   20270205100502_books_a08_search_rating_length.sql.
 * Who calls it: src/features/discovery/api/storyLists.ts (fetchStoryList), shown by
 * src/features/search/components/StoryResultRow.tsx.
 * Tests: supabase/tests/database/410-search-row-reads.test.sql.
 */

/* ---------- The extra fields of a list's cards ---------- */

/**
 * story_list_row_extras: the fields one list adds to a story's card.
 * Input: list_kind (the list, as browse_stories() takes it) and target_story_id (the story).
 * Returns: { reads } for a search (the public reads total over the story's readable chapters, every
 *   edition), else an empty object.
 * Where it fits: browse_stories(), once per card on the page, so only the rows shown pay for it.
 */
create or replace function public.story_list_row_extras(list_kind text, target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when list_kind = 'search' then jsonb_build_object('reads', public.story_read_total(target_story_id))
    else '{}'::jsonb
  end;
$$;

comment on function public.story_list_row_extras(text, uuid) is
  'Internal: the fields a story list adds to its cards; the reads for a search (user story 1.8).';

revoke execute on function public.story_list_row_extras(text, uuid) from public, anon, authenticated;

/* ---------- browse_stories() with the extra fields ---------- */

/**
 * browse_stories: one page of a story list with its total, in the reader's sort.
 * Input: list_kind, list_key, category_slug, completion, language, sort_order, page_size,
 *   page_offset, popular_in, story_rating and story_length, as in 20270205100502.
 * Returns: { total, stories: [story cards, a search's with their reads], popular_in }.
 * Errors: invalid_parameter_value for an unknown list, sort, country or length, a missing key or
 *   a negative offset.
 * Where it fits: every story list of the app (Discover rows, See all pages, category, tag and
 *   writer pages, search results).
 */
create or replace function public.browse_stories(
  list_kind text,
  list_key text default null,
  category_slug text default null,
  completion public.completion_status default null,
  language text default null,
  sort_order text default null,
  page_size integer default 21,
  page_offset integer default 0,
  popular_in text default null,
  story_rating public.story_rating default null,
  story_length text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
  -- For "relevance": the term as a word query and as a pattern, worked out once.
  search_terms tsquery := case when list_kind = 'search' then public.search_query(list_key) end;
  search_pattern text := case when list_kind = 'search' then public.search_like_pattern(list_key) end;
  -- MARKETS-2d: the country whose ranking orders a popular list, or null for the overall one.
  ranked_country text;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or not public.is_story_list_kind(list_kind) then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance', 'shared')
      or (ordering = 'relevance' and list_kind <> 'search')
      or (ordering = 'shared' and list_kind <> 'shared') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1a (user story 1.8, board A08): the Length filter knows two answers.
  if story_length is not null and story_length not in ('short', 'long') then
    raise exception 'Unknown length.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1b (MARKETS-2d): "Popular in" a country. Only a country on the drop-down's list counts;
  -- one with too few ranked stories falls back to the overall ranking (popular_in is then null
  -- in the answer, so the page can say so).
  if popular_in is not null then
    if not public.is_popular_in_country(popular_in) then
      raise exception 'Unknown country.' using errcode = 'invalid_parameter_value';
    end if;
    if ordering = 'popular' and public.country_has_ranking(popular_in) then
      ranked_country := popular_in;
    end if;
  end if;
  -- Step 2: the list once, numbered in the chosen order and counted in the same pass (QA-2a; it
  -- used to be read twice). Only one of the sort lines is switched on (the others are null for
  -- every row); the last two break ties: the newer story, then the address, so pages never
  -- overlap. A story the job hasn't scored yet counts as 0.
  -- User story 1.8 (board A08): the Rating and Length filters narrow the list before it is
  -- numbered, so the total, the pages and the order all agree.
  with listed as (
    select listed_rows.* from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed_rows
    where public.story_matches_list_filters(listed_rows.id, listed_rows.rating, story_rating, story_length)
  ),
  numbered as (
    select listed.id, count(*) over () as list_total, row_number() over (order by
        -- Relevance, as story_search_rank(): 2 for the term inside the title, plus the word rank,
        -- read from the kept search row instead of building it again for every story.
        case when ordering = 'relevance' then
          (case when public.search_fold(listed.title) like search_pattern then 2 else 0 end)
          + ts_rank(coalesce(documents.document, ''::tsvector), search_terms) end desc,
        -- IDEAS-1e: "Most shared this week", by the last 7 days' chapter shares.
        case when ordering = 'shared' then public.story_shares_this_week(listed.id) end desc,
        -- MARKETS-2d: the country's own ranking first; a story with fewer than 5 readers there
        -- isn't ranked in it and follows, in the overall order.
        case when ranked_country is not null then coalesce(country_scores.score, -1) end desc,
        case when ordering in ('popular', 'relevance') then coalesce(scores.score, 0) end desc,
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    left join public.story_country_scores as country_scores
      on ranked_country is not null and country_scores.story_id = listed.id
      and country_scores.country_code = ranked_country
    left join public.story_search_documents as documents
      on ordering = 'relevance' and documents.story_id = listed.id
  ),
  -- Step 3: the page's cards. The total comes from any row; an empty list or a page past the end
  -- counts again below.
  page_rows as (
    select numbered.id, numbered.position, numbered.list_total from numbered
    order by numbered.position
    limit wanted_rows offset coalesce(page_offset, 0)
  )
  -- User story 1.8 (board A08): a search row also says how many reads the story has, the same
  -- public total its story page shows (story_read_total(), BOOKS-B2); other lists don't need it,
  -- so they don't pay for it.
  select coalesce(jsonb_agg(public.story_card_json(page_rows.id)
                            || public.story_list_row_extras(list_kind, page_rows.id)
                            order by page_rows.position), '[]'::jsonb),
         max(page_rows.list_total)
    into page, total
  from page_rows;
  -- Step 4: a page past the end has no rows to carry the total, so count it (rare).
  if total is null then
    select count(*) into total
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed_rows
    where public.story_matches_list_filters(listed_rows.id, listed_rows.rating, story_rating, story_length);
  end if;
  return jsonb_build_object('total', total, 'stories', page, 'popular_in', ranked_country);
end;
$$;
