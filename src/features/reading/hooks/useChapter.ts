/**
 * useChapter: one chapter for the reader (story S1-E4-01a).
 *
 * Who calls it: ChapterReaderPage. What it calls: api/chapter.ts → get_chapter(). The answer is
 * cached per address and per person (the rating and the text depend on who is reading).
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchChapter, type ReaderChapter } from '../api/chapter';

/**
 * Loads the chapter.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns chapter (null while loading or when it may not be seen), isLoaded, loadFailed
 */
export function useChapter(storySlug: string, chapterCode: string) {
  const { userId, isKnown } = useSession();
  const chapter = useQuery<ReaderChapter | null>({
    queryKey: ['reader-chapter', storySlug, chapterCode, userId],
    enabled: isKnown && storySlug !== '' && chapterCode !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchChapter(client, storySlug, chapterCode);
    },
  });
  return {
    chapter: chapter.data ?? null,
    isLoaded: chapter.isSuccess,
    loadFailed: chapter.isError,
  };
}
