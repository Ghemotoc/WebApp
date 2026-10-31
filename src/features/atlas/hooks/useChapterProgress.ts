/**
 * useChapterProgress: a story's chapters with each one's words against its target, for the list
 * beside the writing view (stories S1-E17-23 and S1-E17-26).
 *
 * Who calls it: WritingChapterList. What it calls: api/chapterPlans.ts → story_chapter_progress().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  chapterProgressQueryKey,
  fetchChapterProgress,
  type ChapterProgress,
} from '../api/chapterPlans';

/**
 * Follows a story's chapter list.
 *
 * @param slug - the story's address
 * @returns chapters (null when the story isn't the writer's, undefined while loading) and
 *   loadFailed
 */
export function useChapterProgress(slug: string) {
  const { userId } = useSession();
  const chapters = useQuery<ChapterProgress[] | null>({
    queryKey: chapterProgressQueryKey(userId, slug),
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchChapterProgress(await requireClient(), slug),
  });
  return { chapters: chapters.data, loadFailed: chapters.isError };
}
