/**
 * The "#tag" links under a genre or tag page's title (BOOKS-A06 and BOOKS-A09, user stories 1.6
 * and 1.9; boards A06-ReadGenre and A09-ReadTag).
 *
 * Who calls it: hooks/useTopicTags.ts, for TopicFollowBar.
 * What it calls next: topic_tags(), which anyone may call. On a genre page it gives the tags the
 * genre's stories use most; on a tag page the tags that sit on the same stories. It counts only
 * stories this reader may see and only tags staff approved.
 */
import { getSupabaseClient } from '@/lib/supabase';

/** How many tags the line shows (board A06 draws eight; A09 draws four of a shorter list). */
export const topicTagCount = 8;

/**
 * Reads a genre's top tags or a tag's related tags.
 *
 * @param topicKind - 'category' for a genre page, 'tag' for a tag page
 * @param topicKey - the genre's slug or the tag's name, from the page address
 * @returns the tags' names, most stories first
 * Errors: throws with the database's message when they can't be read.
 */
export async function fetchTopicTags(
  topicKind: 'category' | 'tag',
  topicKey: string,
): Promise<string[]> {
  const client = await getSupabaseClient();
  if (client === null) throw new Error('The app is not connected to its database.');
  const { data, error } = await client.rpc('topic_tags', {
    topic_kind: topicKind,
    topic_key: topicKey,
    how_many: topicTagCount,
  });
  if (error !== null) throw new Error(`Could not read the tags: ${error.message}`);
  return data as unknown as string[];
}
