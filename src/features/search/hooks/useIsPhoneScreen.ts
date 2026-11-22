/**
 * useIsPhoneScreen: whether the window is narrower than 768 px, where Search shows its results as
 * rows instead of shelves (bundle CALM-7c; handover Step 3, "Search on phones"; board
 * simplified/New-PhoneSearch).
 *
 * It follows the browser's own media query, so the page changes the moment a window is resized or
 * a phone is turned, and only one layout is ever drawn (never two copies of the same links).
 * Who calls it: SearchResults. What it calls: window.matchMedia.
 */
import { useSyncExternalStore } from 'react';

/** Narrower than 768 px: Tailwind's md breakpoint, where the tablet layout starts. */
const PHONE_QUERY = '(max-width: 767.98px)';

/**
 * Reads the media query, or null where the browser has none (unit tests), so the wide layout is
 * the safe default.
 *
 * @returns the query's list, or null
 */
function phoneQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(PHONE_QUERY);
}

/**
 * Listens for the window crossing 768 px.
 *
 * @param onChange - React's callback to read the value again
 * @returns a function that stops listening
 */
function subscribe(onChange: () => void): () => void {
  const query = phoneQuery();
  if (query === null) return () => undefined;
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the window is phone-sized right now.
 *
 * @returns true under 768 px
 */
export function useIsPhoneScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => phoneQuery()?.matches ?? false,
    () => false,
  );
}
