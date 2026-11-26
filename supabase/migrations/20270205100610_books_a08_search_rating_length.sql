/*
 * Migration: the Rating and Length filters of the search results (user story 1.8, board
 * A08-SearchResults of "Build: the full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC:
 * "ensure that there are no missing widgets between the pages from the canvas versus the one on
 * the live site").
 *
 * Why: board A08's "Filter and sort" column has five groups: Sort, Status, Language, Rating and
 * Length. The first three were built; Rating and Length needed the story list to filter by them
 * in the database, so that the total, the pages and the order stay right (docs/board-fixes.md).
 * What it changes:
 * - story_matches_list_filters(): whether one story passes a rating and a length, the one place
 *   both rules live;
 * - browse_stories() takes two more optional inputs, story_rating (one rating, or null for any)
 *   and story_length ('short': under 10 readable chapters, 'long': 10 or more, or null for any).
 *   Everything else is as in 20270205100203_markets2d_popular_in.sql. A rating above the reader's
 *   age never shows anyway: listed_stories() already leaves it out (CLAUDE.md rule 18), so asking
 *   for 18+ as a 16-year-old gives an empty list, never an 18+ story.
 * Who calls it: src/features/discovery/api/storyLists.ts (fetchStoryList), with the filters the
 * search page keeps in its address (src/features/search/lib/searchFilters.ts).
 * Tests: supabase/tests/database/408-story-list-filters.test.sql.
 */

/* ---------- One story against the filters ---------- */

/**
 * story_matches_list_filters: whether a story passes the Rating and Length filters.
 * Input: story_row_id (the story), story_row_rating (its rating, already read with the row),
 *   wanted_rating (one rating, or null for any), wanted_length ('short', 'long' or null for any).
 * Returns: true when both filters let it through.
 * Where it fits: browse_stories(), for every story of a list, before the list is numbered. The
 *   chapter count is the one the card shows (story_card_json): published, undeleted and readable.
 */
create or replace function public.story_matches_list_filters(
  story_row_id uuid,
  story_row_rating public.story_rating,
  wanted_rating public.story_rating,
  wanted_length text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  readable_chapters integer;
begin
  -- Step 1: the rating, when one was picked.
  if wanted_rating is not null and story_row_rating is distinct from wanted_rating then
    return false;
  end if;
  -- Step 2: no length picked, so nothing more to count.
  if wanted_length is null then
    return true;
  end if;
  -- Step 3: the readable chapters, counted as the story card counts them.
  select count(*) into readable_chapters
  from public.chapters
  where chapters.story_id = story_row_id
    and chapters.status = 'published' and chapters.deleted_at is null
    and public.chapter_is_readable(chapters.id);
  -- Step 4: under 10 chapters is short, 10 or more is long (board A08).
  if wanted_length = 'short' then
    return readable_chapters < 10;
  end if;
  return readable_chapters >= 10;
end;
$$;

comment on function public.story_matches_list_filters(uuid, public.story_rating, public.story_rating, text) is
  'Internal: whether a story passes the Rating and Length filters of a story list (user story 1.8).';

revoke execute on function public.story_matches_list_filters(uuid, public.story_rating, public.story_rating, text) from public, anon, authenticated;

/* ---------- browse_stories() with the two filters ---------- */

-- The old signature goes first, so the app never sees two browse_stories() to choose from.
drop function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text);

/**
 * browse_stories: one page of a story list with its total, in the reader's sort.
 * Input: as before (list_kind, list_key, category_slug, completion, language, sort_order,
 *   page_size, page_offset, popular_in), plus story_rating (one rating or null) and story_length
 *   ('short', 'long' or null).
 * Returns: { total, stories: [story cards], popular_in }.
 * Errors: invalid_parameter_value for an unknown list, sort, country or length, a missing key or
 *   a negative offset.
 * Where it fits: every story list of the app (Discover rows, See all pages, category, tag and
 *   writer pages, search results).
 */
create function public.browse_stories(
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
  select coalesce(jsonb_agg(public.story_card_json(page_rows.id) order by page_rows.position), '[]'::jsonb),
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

comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text) is
  'One page of a story list (Discover shelves, category, tag and See all pages, search) with its total, in the reader''s sort; popular by default, optionally by one country''s ranking, one rating and one length (S1-E5-01, S1-E5-02, S1-E5-03, MARKETS-2d, user story 1.8).';

revoke all on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text) from public;
grant execute on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text) to anon, authenticated;
