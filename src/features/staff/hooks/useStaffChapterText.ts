/**
 * useStaffChapterText: a published chapter's words, read-only, for staff removing a passage
 * (bundle ADMIN-2, part b2; story S1-E11-08, part 08b).
 *
 * Who calls it: ChapterPassageForm, only once staff open it. What it calls:
 * api/staffStoryHistory.ts fetchStaffChapterText(). useChangeStaffStory reads it again after a
 * passage is removed or put back, so the words on screen are the ones now stored.
 */
import { useQuery } from '@tanstack/react-query';

import { fetchStaffChapterText, type StaffChapterText } from '../api/staffStoryHistory';

import { requireStaffClient } from './requireStaffClient';

/**
 * Follows one chapter's words.
 *
 * @param chapterId - the chapter
 * @param isWanted - false until staff open the form, so nothing is read before
 * @returns the words (null while loading), whether they are loading and whether loading failed
 */
export function useStaffChapterText(chapterId: string, isWanted: boolean) {
  const chapter = useQuery<StaffChapterText>({
    queryKey: ['staff-chapter-text', chapterId],
    enabled: isWanted,
    retry: false,
    queryFn: async () => fetchStaffChapterText(await requireStaffClient(), chapterId),
  });
  return {
    chapter: chapter.data ?? null,
    isLoading: chapter.isPending,
    hasFailed: chapter.isError,
  };
}
