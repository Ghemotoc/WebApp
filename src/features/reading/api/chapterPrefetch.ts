/**
 * Starts reading a chapter as soon as its address is known, before the reader's code has
 * arrived (story S1-E4-01b; S1-E4-01's criterion "readable within 2 seconds on a mid-range phone
 * on 4G").
 *
 * Why: on a cold load the reader otherwise waits for its own code, then for the session, then
 * for get_chapter(), one after the other. The route's loader (src/app/router.tsx) calls
 * prefetchChapter() the moment the address matches, so the Supabase library, the session and the
 * chapter load while the reader's code downloads; useChapter then takes that answer instead of
 * asking again.
 * Who calls it: the reader route's loader (prefetchChapter) and hooks/useChapter.ts
 * (takePrefetchedChapter).
 * What it calls: api/chapter.ts → get_chapter(), through the shared Supabase client, which reads
 * the stored session itself, so the answer is the one the signed-in reader would get.
 */
import { getSupabaseClient } from '@/lib/supabase';

import { fetchChapter, type ReaderChapter } from './chapter';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The answers started early, by "story/chapter"; each is taken once. */
const startedReads = new Map<string, Promise<ReaderChapter | null>>();

/** The map's key for an address. */
function addressKey(storySlug: string, chapterCode: string): string {
  return `${storySlug}/${chapterCode}`;
}

/**
 * Starts get_chapter() for an address, without waiting for it.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 */
export function prefetchChapter(storySlug: string, chapterCode: string): void {
  const read = (async () => {
    const client = await getSupabaseClient();
    if (client === null) throw new Error('The app is not connected to its database.');
    return fetchChapter(client, storySlug, chapterCode);
  })();
  // A failure here is handled by whoever takes it (useChapter shows "couldn't load"); until then
  // it must not surface as an unhandled rejection.
  read.catch(errorShownByHook);
  startedReads.set(addressKey(storySlug, chapterCode), read);
}

/**
 * Takes the answer started for an address, if there is one; later reads ask the database again.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns the started read, or undefined
 */
export function takePrefetchedChapter(
  storySlug: string,
  chapterCode: string,
): Promise<ReaderChapter | null> | undefined {
  const key = addressKey(storySlug, chapterCode);
  const read = startedReads.get(key);
  startedReads.delete(key);
  return read;
}
