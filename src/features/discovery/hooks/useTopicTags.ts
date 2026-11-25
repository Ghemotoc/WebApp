/**
 * useTopicTags: a genre's top tags or a tag's related tags, for TopicFollowBar (BOOKS-A06,
 * BOOKS-A09).
 *
 * Who calls it: TopicFollowBar. What it calls: api/topicTags.ts → topic_tags(). The answer
 * depends on who is looking (ratings and blocks), so the cache key carries the session.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import { fetchTopicTags } from '../api/topicTags';

/**
 * Reads the tags for one genre or tag page.
 *
 * @param topicKind - 'category' or 'tag'
 * @param topicKey - the slug or the tag's name
 * @returns the tags (empty while loading or when the read failed: the line is extra, the page
 *   works without it) and whether the read failed
 */
export function useTopicTags(topicKind: 'category' | 'tag', topicKey: string) {
  const { userId, isKnown } = useSession();
  const tags = useQuery({
    queryKey: ['topic-tags', topicKind, topicKey, userId],
    enabled: isKnown && topicKey !== '',
    queryFn: async () => fetchTopicTags(topicKind, topicKey),
    staleTime: 5 * 60 * 1000,
  });
  return { tags: tags.data ?? [], hasFailed: tags.isError };
}
