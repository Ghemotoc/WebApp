/**
 * Tag ranks: where a story stands in each of its tags, and the writer's pick of rank badges for its
 * cover (CMS-1g; Robert, 30 Oct 2026, 10:44 to 10:48).
 *
 * Who calls it: hooks/useTagRanks.ts (the story page's badges and the picker in Story settings).
 * What it calls next: story_tag_ranks(), which ranks the story by the tag page's popular order
 * among the stories this reader may see, and set_rank_badge_tags(), which only the story's writer
 * may call (…_cms_1g_tag_rank_badges.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Where a story stands in one of its tags. */
export interface TagRank {
  /** The tag's stored name; screens show it in the interface language (useTagCatalogue). */
  tagName: string;
  /** Its place, 1 for the first; null when no rank is shown (no score yet, or a small tag). */
  rank: number | null;
  /** How many stories the reader may see with this tag; null with rank. */
  outOf: number | null;
  /** The writer picked this tag for the badges. */
  isPicked: boolean;
  /** The cover shows this rank as a badge. */
  isBadge: boolean;
}

/** The outcome of saving the writer's pick, as the other story settings answer. */
export type RankPickOutcome = 'ok' | 'not_active' | 'not_found';

/**
 * Reads a story's ranks in its approved tags, for the signed-in reader or a visitor.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's public address
 * @returns one entry per approved tag, in the story's tag order; empty when the reader may not
 *   see the story
 * Errors: throws when the database can't be reached; the page then shows no badges.
 */
export async function fetchTagRanks(client: AppSupabaseClient, slug: string): Promise<TagRank[]> {
  const { data, error } = await client.rpc('story_tag_ranks', { story_slug: slug });
  if (error !== null) throw new Error(`Could not read the story's ranks: ${error.message}`);
  return data.map((row) => {
    // The function answers null for both numbers when no rank is shown (the generated type can't
    // say so), so read them as possibly missing.
    const rank: unknown = row.tag_rank;
    const outOf: unknown = row.stories_in_tag;
    return {
      tagName: row.tag_name,
      rank: typeof rank === 'number' ? rank : null,
      outOf: typeof outOf === 'number' ? outOf : null,
      isPicked: row.is_picked,
      isBadge: row.is_badge,
    };
  });
}

/**
 * Saves which tags the badges on the writer's cover show.
 *
 * @param client - the shared Supabase client
 * @param slug - the writer's story
 * @param tagNames - up to 3 of the story's approved tags; an empty list means automatic (the 3
 *   best ranks)
 * @returns the outcome
 * Errors: throws when the database refuses the pick (more than 3, or a tag not on the story) or
 *   can't be reached.
 */
export async function saveRankBadgePick(
  client: AppSupabaseClient,
  slug: string,
  tagNames: string[],
): Promise<RankPickOutcome> {
  const { data, error } = await client.rpc('set_rank_badge_tags', {
    story_slug: slug,
    tag_names: tagNames,
  });
  if (error !== null) throw new Error(`Could not save the rank badges: ${error.message}`);
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome === 'ok' || outcome === 'not_active' || outcome === 'not_found') return outcome;
  throw new Error(`Unexpected answer from set_rank_badge_tags: ${JSON.stringify(data)}`);
}
