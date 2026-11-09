/**
 * useIsWideReader: whether the window is at least 1280 px wide, where the reader has room for a
 * side column beside the paper (bundle G7d2; board ReaderComments).
 *
 * From 1280 px a paragraph's comments open in the side column, so the text keeps its place and
 * the reader sees both at once; below that they open under the paragraph, as before (S1-E6-06).
 * It follows the browser's own media query, so it changes the moment the window is resized.
 * Who calls it: LazyParagraphThread and ChapterReaderPage. What it calls: window.matchMedia.
 */
import { useSyncExternalStore } from 'react';

/** At least 1280 px: Tailwind's xl breakpoint, where the reader's side column appears. */
const WIDE_QUERY = '(min-width: 1280px)';

/**
 * Reads the media query, or null where the browser has none (unit tests, very old browsers), so
 * the thread under the paragraph is the safe default.
 *
 * @returns the query's list, or null
 */
function wideQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(WIDE_QUERY);
}

/**
 * Listens for the window crossing 1280 px.
 *
 * @param onChange - React's callback to read the value again
 * @returns a function that stops listening
 */
function subscribe(onChange: () => void): () => void {
  const query = wideQuery();
  if (query === null) return () => undefined;
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the window is at least 1280 px wide right now.
 *
 * @returns true on a wide desktop window
 */
export function useIsWideReader(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => wideQuery()?.matches ?? false,
    () => false,
  );
}
