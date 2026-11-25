/*
 * Migration: the Search page's "Trending tags" (user story 1.7, board A07-Search of "Build: the
 * full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC: "ensure that there are no missing
 * widgets between the pages from the canvas versus the one on the live site").
 *
 * Why: board A07 draws "Trending tags" before a search: the tags most read this week, each a link
 * to its tag page. Nothing read tags by this week's reading (docs/board-fixes.md).
 * What it changes: trending_tags(), the approved tags whose stories were read most in the last
 * seven days, over the stories the reader may see.
 * Who calls it: src/features/search/api/search.ts (fetchTrendingTags), for the Search page's
 * TrendingTags.
 * Tests: supabase/tests/database/411-trending-tags.test.sql.
 */

/**
 * trending_tags: the tags most read this week.
 * Input: how_many (1 to 20, 6 by default, as board A07 draws).
 * Returns: a JSON array of tag names, the most read first (ties by name). A tag counts the reads
 *   of the last seven days, today included, of the stories it is on that the caller may see
 *   (listed_stories(): ratings above the reader's age, blocks, moderation and drafts left out), so
 *   a tag only a hidden story carries never trends for this reader. Only approved tags show; a
 *   week with no reads gives an empty array.
 * Errors: none of its own.
 * Where it fits: the Search page before a search (board A07), under Recent searches.
 */
create or replace function public.trending_tags(how_many integer default 6)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(ranked.name order by ranked.week_reads desc, ranked.name), '[]'::jsonb)
  from (
    -- Step 1: this week's reads of each story the caller may see.
    with week_reads as (
      select story.id as story_id, sum(chapter_reads.total) as reads
      from public.listed_stories('popular', null, null, null, null) as story
      join public.chapters on chapters.story_id = story.id
      join public.chapter_reads on chapter_reads.chapter_id = chapters.id
      where chapter_reads.read_on > current_date - 7
        and public.chapter_is_readable(chapters.id)
      group by story.id
    )
    -- Step 2: each approved tag's share of them, the most read first.
    select tags.name, sum(week_reads.reads) as week_reads
    from week_reads
    join public.story_tags on story_tags.story_id = week_reads.story_id
    join public.tags on tags.id = story_tags.tag_id
    where tags.status = 'approved'
    group by tags.id, tags.name
    having sum(week_reads.reads) > 0
    order by week_reads desc, tags.name
    limit least(greatest(coalesce(how_many, 6), 1), 20)
  ) as ranked;
$$;

comment on function public.trending_tags(integer) is
  'The approved tags whose stories the caller may see were read most in the last seven days (user story 1.7, board A07).';

revoke all on function public.trending_tags(integer) from public;
grant execute on function public.trending_tags(integer) to anon, authenticated;
