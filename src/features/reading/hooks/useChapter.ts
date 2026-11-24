/**
 * useChapter: one chapter for the reader (story S1-E4-01a).
 *
 * Who calls it: ChapterReaderPage. What it calls: api/chapter.ts → get_chapter(). The answer is
 * cached per address and per person (the rating and the text depend on who is reading). On the
 * first load of an address it takes the read the route's loader already started
 * (api/chapterPrefetch.ts, S1-E4-01b), so the text arrives sooner; when that answer is already in
 * on the first draw, it is shown in that draw (reader speed, 23 Nov 2026).
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchChapter, type ReaderChapter } from '../api/chapter';
import {
  forgetAnsweredChapter,
  peekAnsweredChapter,
  takePrefetchedChapter,
} from '../api/chapterPrefetch';

/**
 * Loads the chapter.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns chapter (null while loading or when it may not be seen), isLoaded, loadFailed
 */
export function useChapter(storySlug: string, chapterCode: string) {
  const { userId, isKnown } = useSession();
  // The loader's answer if it is already in on the first draw, with the address it is for.
  const [answered] = useState(() => {
    const peeked = peekAnsweredChapter(storySlug, chapterCode);
    return peeked === undefined ? null : { storySlug, chapterCode, chapter: peeked.chapter };
  });
  // Once the reader is on screen with it, the loader's answer is used up.
  useEffect(() => {
    if (answered !== null) forgetAnsweredChapter(answered.storySlug, answered.chapterCode);
  }, [answered]);
  // It counts only for that address: the reader can move on to another chapter on the same page.
  const answeredHere =
    answered !== null && answered.storySlug === storySlug && answered.chapterCode === chapterCode;
  const chapter = useQuery<ReaderChapter | null>({
    queryKey: ['reader-chapter', storySlug, chapterCode, userId],
    enabled: isKnown && storySlug !== '' && chapterCode !== '',
    // A fresh answer from the loader is shown at once, and not asked for again on this first draw;
    // any later visit to the chapter asks the database as before.
    initialData: answeredHere ? answered.chapter : undefined,
    refetchOnMount: !answeredHere,
    queryFn: async () => {
      // The loader may already have started this read; take it rather than asking twice.
      const started = takePrefetchedChapter(storySlug, chapterCode);
      if (started !== undefined) return started;
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
