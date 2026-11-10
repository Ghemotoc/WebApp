/**
 * useRecordThreadView: counts one view when someone opens a forum thread (bundle GAPS-16, part d;
 * story S1-E8-02; board 5.2, "Views").
 *
 * The rule: at most once per thread per tab session, so reloading or going back and forth doesn't
 * inflate the total, as with chapter reads (S1-E4-01a, useRecordRead). The tab remembers which
 * threads it counted in sessionStorage (thread numbers only, nothing about the reader); when the
 * browser blocks storage, the view is still counted once per page view. The database leaves out
 * the starter's own visits and keeps only a total.
 * Who calls it: ThreadPage, once the thread has loaded.
 * What it calls: api/forumViews.ts → record_forum_thread_view().
 */
import { useEffect } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { recordThreadView } from '../api/forumViews';

/** The sessionStorage key that lists the threads this tab has counted. */
export const COUNTED_THREADS_KEY = 'forum-counted-threads';

/** The thread numbers this tab already counted; empty when storage is blocked. */
function countedThreads(): number[] {
  try {
    const stored = window.sessionStorage.getItem(COUNTED_THREADS_KEY);
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((number) => typeof number === 'number') : [];
  } catch {
    return [];
  }
}

/** Remembers a counted thread; a blocked storage is fine (the view was still counted). */
function rememberCounted(threadNumber: number) {
  try {
    window.sessionStorage.setItem(
      COUNTED_THREADS_KEY,
      JSON.stringify([...countedThreads(), threadNumber]),
    );
  } catch {
    // Storage is blocked (a private window, a strict browser): nothing to remember.
  }
}

/**
 * Sends the view once.
 *
 * @param threadNumber - the thread's number
 * @param isShown - true once the thread is on screen
 */
export function useRecordThreadView(threadNumber: number, isShown: boolean) {
  useEffect(() => {
    // Step 1: only for a thread on screen, and only the first time in this tab.
    if (!isShown || countedThreads().includes(threadNumber)) return;
    rememberCounted(threadNumber);
    // Step 2: send it. A failure only means one view is missing from a total, so it is reported
    // to the console for developers and the reader is not interrupted.
    void (async () => {
      try {
        const client = await getSupabaseClient();
        if (client !== null) await recordThreadView(client, threadNumber);
      } catch (error) {
        console.warn('A thread view was not counted.', error);
      }
    })();
  }, [threadNumber, isShown]);
}
