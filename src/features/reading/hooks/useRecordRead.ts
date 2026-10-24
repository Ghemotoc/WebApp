/**
 * useRecordRead: counts one read when a signed-in reader opens a chapter's text (story
 * S1-E4-01a; the March numbers, S1-E15-02).
 *
 * The rule: at most once per chapter per tab session, so reloading or going back and forth
 * doesn't inflate the total. The tab remembers which chapters it counted in sessionStorage
 * (chapter codes only, nothing about the reader); when the browser blocks storage, the read is
 * still counted once per page view. The database leaves out the writer's own reads.
 * Who calls it: ChapterReaderPage, once the text is on screen.
 * What it calls: api/chapter.ts → record_chapter_read().
 */
import { useEffect } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { recordChapterRead } from '../api/chapter';

/** The sessionStorage key that lists the chapters this tab has counted. */
export const COUNTED_CHAPTERS_KEY = 'reader-counted-chapters';

/** The codes this tab already counted; empty when storage is blocked. */
function countedChapters(): string[] {
  try {
    const stored = window.sessionStorage.getItem(COUNTED_CHAPTERS_KEY);
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((code) => typeof code === 'string') : [];
  } catch {
    return [];
  }
}

/** Remembers a counted code; a blocked storage is fine (the read was still counted). */
function rememberCounted(code: string) {
  try {
    window.sessionStorage.setItem(
      COUNTED_CHAPTERS_KEY,
      JSON.stringify([...countedChapters(), code]),
    );
  } catch {
    // Storage is blocked (a private window, a strict browser): nothing to remember.
  }
}

/**
 * Sends the read once.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @param isShowingText - true once a signed-in reader has the text on screen
 */
export function useRecordRead(storySlug: string, chapterCode: string, isShowingText: boolean) {
  useEffect(() => {
    // Step 1: only for text on screen, and only the first time in this tab.
    if (!isShowingText || countedChapters().includes(chapterCode)) return;
    rememberCounted(chapterCode);
    // Step 2: send it. A failure only means one read is missing from a total, so it is
    // reported to the console for developers and the reader is not interrupted.
    void (async () => {
      try {
        const client = await getSupabaseClient();
        if (client !== null) await recordChapterRead(client, storySlug, chapterCode);
      } catch (error) {
        console.warn('A chapter read was not counted.', error);
      }
    })();
  }, [storySlug, chapterCode, isShowingText]);
}
