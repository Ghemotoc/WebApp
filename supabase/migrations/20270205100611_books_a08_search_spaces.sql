/*
 * Migration: search spaces by name and description, for the Spaces tab of the search results
 * (user story 1.8, board A08-SearchResults of "Build: the full design as user stories"; Robert,
 * 25 Nov 2026, 09:50 UTC: "ensure that there are no missing widgets between the pages from the
 * canvas versus the one on the live site").
 *
 * Why: board A08 draws four tabs, Stories, Writers, Together and Spaces. Spaces needed a search of
 * its own (docs/board-fixes.md); the Spaces page (space_list()) lists every space the reader may
 * see but can't narrow them to a term.
 * What it changes: search_spaces(), one page of the spaces whose name or description holds the
 * term, with the same answer as space_list() and the same rule for which cards a reader may see
 * (space_card_visible(): the age group, a class only for its members, blocks and moderation).
 * Who calls it: src/features/spaces/api/spaces.ts (fetchFoundSpaces), for the search's Spaces tab
 * (src/features/search/components/SearchSpacesTab.tsx).
 * Tests: supabase/tests/database/409-search-spaces.test.sql.
 */

/**
 * search_spaces: one page of the spaces that match a search term, the busiest first.
 * Input: term (what the reader typed; matched without diacritics or case against the space's
 *   name and description, at least 2 letters), skip and how_many (1 to 50, 20 by default).
 * Returns: { spaces: [space_json()], total, has_more }, as space_list() does; a term shorter than
 *   2 letters finds nothing.
 * Errors: none of its own.
 * Where it fits: the search results' Spaces tab and its count (board A08).
 */
create or replace function public.search_spaces(
  term text,
  skip integer default 0,
  how_many integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page_size integer := least(greatest(coalesce(how_many, 20), 1), 50);
  pattern text := public.search_like_pattern(term);
  found jsonb;
  total integer;
begin
  -- Step 1: a term under 2 letters is too short to mean anything, as for stories (S1-E5-04).
  if char_length(public.search_fold(term)) < 2 then
    return jsonb_build_object('spaces', '[]'::jsonb, 'total', 0, 'has_more', false);
  end if;
  -- Step 2: every live space whose card the caller may see and whose name or description holds
  -- the term, without diacritics; the busiest first, then one page.
  with seen as (
    select spaces as row_data, public.space_latest_activity(spaces) as activity from public.spaces
    where spaces.deleted_at is null and public.space_card_visible(spaces)
      and public.search_fold(spaces.name || ' ' || spaces.description) like pattern
  ), page as (
    select seen.* from seen order by seen.activity desc, (seen.row_data).name
    offset greatest(coalesce(skip, 0), 0) limit page_size
  )
  select coalesce((select jsonb_agg(public.space_json(page.row_data) order by page.activity desc, (page.row_data).name)
                   from page), '[]'::jsonb),
         (select count(*)::integer from seen)
  into found, total;
  -- Step 3: the answer, shaped as space_list()'s.
  return jsonb_build_object('spaces', found, 'total', total,
    'has_more', greatest(coalesce(skip, 0), 0) + page_size < total);
end;
$$;

comment on function public.search_spaces(text, integer, integer) is
  'One page of the spaces whose name or description holds a search term, as the reader may see them (user story 1.8, board A08).';

revoke all on function public.search_spaces(text, integer, integer) from public;
grant execute on function public.search_spaces(text, integer, integer) to anon, authenticated;
