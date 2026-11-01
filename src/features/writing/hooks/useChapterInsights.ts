/**
 * useChapterInsights: one chapter's most-loved lines and where readers stop, for its writer
 * (bundle IDEAS-1, part d; ideas IDEA-20261031-1 and -5).
 *
 * Who calls it: ChapterInsights on the writer dashboard. What it calls: api/insights.ts →
 * writer_chapter_insights(). It asks only once a chapter is chosen.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchChapterInsights, type ChapterInsights } from '../api/insights';

/**
 * Follows one chapter's numbers.
 *
 * @param storySlug - the story's address, or null before a chapter is chosen
 * @param chapterCode - the chapter's code, or null before a chapter is chosen
 * @returns insights (null while loading or for a chapter that isn't the writer's), isLoading and
 *   loadFailed
 */
export function useChapterInsights(storySlug: string | null, chapterCode: string | null) {
  const { userId } = useSession();
  const query = useQuery<ChapterInsights | null>({
    queryKey: ['chapter-insights', userId, storySlug, chapterCode],
    enabled: userId !== null && storySlug !== null && chapterCode !== null,
    queryFn: async () =>
      fetchChapterInsights(await requireClient(), storySlug ?? '', chapterCode ?? ''),
  });
  return {
    insights: query.data ?? null,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    loadFailed: query.isError,
  };
}
