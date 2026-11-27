/**
 * useMinWidth: whether the window is at least a given width, following the browser's own media
 * query so it changes the moment the window is resized (BOOKS-D05b).
 *
 * Why a hook and not only CSS: some pieces are different elements at different widths, not just a
 * different look, such as a footnote's note, which opens under its number from 768 px and as a
 * sheet on phones (board B15-ReaderFootnotes). Drawing both and hiding one would leave two copies
 * of the same note for screen readers.
 * Who calls it: FootnoteMarker (src/features/reading/components/). What it calls: matchMedia.
 */
import { useCallback, useSyncExternalStore } from 'react';

/**
 * The media query for a width, or null where the browser has none, so the narrow layout is the
 * safe default.
 *
 * @param pixels - the smallest width
 * @returns the query's list, or null
 */
function minWidthQuery(pixels: number): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(`(min-width: ${pixels}px)`);
}

/**
 * Whether the window is at least `pixels` wide right now.
 *
 * @param pixels - the smallest width, such as 768 for Tailwind's md
 * @returns true from that width up
 */
export function useMinWidth(pixels: number): boolean {
  // Listens for the window crossing the width; React reads the value again on each change.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const query = minWidthQuery(pixels);
      if (query === null) return () => undefined;
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    [pixels],
  );
  return useSyncExternalStore(
    subscribe,
    () => minWidthQuery(pixels)?.matches ?? false,
    () => false,
  );
}
