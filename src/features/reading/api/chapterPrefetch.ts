/**
 * Starts reading a chapter as soon as its address is known, before the reader's code has
 * arrived (story S1-E4-01b; S1-E4-01's criterion "readable within 2 seconds on a mid-range phone
 * on 4G").
 *
 * Why: on a cold load the reader otherwise waits for its own code, then for the session, then
 * for get_chapter(), one after the other. The route's loader (src/app/router.tsx) calls
 * prefetchChapter() the moment the address matches, so the Supabase library, the session and the
 * chapter load while the reader's code downloads; useChapter then takes that answer instead of
 * asking again. When the answer is already in by the time the reader first draws, useChapter
 * shows it in that very first draw (peekAnsweredChapter), instead of waiting for the page to
 * settle before it looks (reader speed, 23 Nov 2026).
 * Who calls it: the reader route's loader (prefetchChapter) and hooks/useChapter.ts
 * (peekAnsweredChapter, forgetAnsweredChapter, takePrefetchedChapter).
 * What it calls: api/chapter.ts → get_chapter(), through the shared Supabase client, which reads
 * the stored session itself, so the answer is the one the signed-in reader would get.
 */
import { getSupabaseClient } from '@/lib/supabase';

import { fetchChapter, type ReaderChapter } from './chapter';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The answers started early, by "story/chapter"; each is taken once. */
const startedReads = new Map<string, Promise<ReaderChapter | null>>();

/** The answers that have arrived, by "story/chapter"; each is taken once, with its read. */
const answeredReads = new Map<string, ReaderChapter | null>();

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
  const key = addressKey(storySlug, chapterCode);
  startedReads.set(key, read);
  // Once it arrives, keep the answer itself too, so the reader can show it without waiting.
  // Only while the read is still the one kept: a newer start for the same address replaces it.
  read
    .then((chapter) => {
      if (startedReads.get(key) === read) answeredReads.set(key, chapter);
    })
    .catch(() => undefined);
}

/**
 * Looks at the answer started for an address, if it has already arrived. It stays until
 * forgetAnsweredChapter() or takePrefetchedChapter(), because React may draw the reader more than
 * once before it shows it, and each of those draws must find the same answer.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns { chapter } when the answer is in (chapter may be null: the reader may not see it),
 *   or undefined while it is still on its way or was never started
 */
export function peekAnsweredChapter(
  storySlug: string,
  chapterCode: string,
): { chapter: ReaderChapter | null } | undefined {
  const key = addressKey(storySlug, chapterCode);
  if (!answeredReads.has(key)) return undefined;
  return { chapter: answeredReads.get(key) ?? null };
}

/**
 * Forgets the answer started for an address, once the reader is showing it; a later visit asks
 * the database again.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 */
export function forgetAnsweredChapter(storySlug: string, chapterCode: string): void {
  const key = addressKey(storySlug, chapterCode);
  answeredReads.delete(key);
  startedReads.delete(key);
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
  answeredReads.delete(key);
  return read;
}
