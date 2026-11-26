/**
 * useIsWideEditor: whether the window is at least 1024 px wide, where the chapter editor shows its
 * side columns (board D05, user story 5.5).
 *
 * From 1024 px the chapter plan sits in the right-hand column; below that it opens in a sheet from
 * the toolbar. The plan's fields carry fixed ids (their labels point at them), so only one of the
 * two may be on the page at a time: a hidden copy would take the labels and the second copy's
 * fields would have none (WCAG 1.3.1, 4.1.2). This hook says which one to draw.
 * It follows the browser's own media query, so it changes the moment the window is resized.
 * Who calls it: ChapterEditorPage. What it calls: window.matchMedia.
 */
import { useSyncExternalStore } from 'react';

/** At least 1024 px: Tailwind's lg breakpoint, where the editor's side columns appear. */
const WIDE_QUERY = '(min-width: 1024px)';

/**
 * Reads the media query, or null where the browser has none (very old browsers), so the sheet
 * is the safe default.
 *
 * @returns the query's list, or null
 */
function wideQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(WIDE_QUERY);
}

/**
 * Listens for the window crossing 1024 px.
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
 * Whether the window is at least 1024 px wide right now.
 *
 * @returns true when the editor has room for its side columns
 */
export function useIsWideEditor(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => wideQuery()?.matches ?? false,
    () => false,
  );
}
