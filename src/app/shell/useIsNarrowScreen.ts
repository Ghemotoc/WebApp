/**
 * useIsNarrowScreen: whether the window is narrower than 1024 px, where the website shows the
 * simpler phone and tablet screens (bundle G4 SHELL; handoff "Rules for the narrow screens": reflow
 * by width, never by device name).
 *
 * It follows the browser's own media query, so it changes the moment the window is resized or a
 * tablet is turned. Only one header is drawn at a time, so the page never holds two "Main"
 * navigations or two account buttons.
 * Who calls it: AppLayout. What it calls: window.matchMedia.
 */
import { useSyncExternalStore } from 'react';

/** Narrower than 1024 px: Tailwind's lg breakpoint, where the full website top bar starts. */
const NARROW_QUERY = '(max-width: 1023.98px)';

/**
 * Reads the media query, or false where the browser has none (tests, very old browsers), so the
 * full website top bar is the safe default.
 *
 * @returns the query's list, or null
 */
function narrowQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(NARROW_QUERY);
}

/**
 * Listens for the window crossing 1024 px.
 *
 * @param onChange - React's callback to read the value again
 * @returns a function that stops listening
 */
function subscribe(onChange: () => void): () => void {
  const query = narrowQuery();
  if (query === null) return () => undefined;
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the window is narrower than 1024 px right now.
 *
 * @returns true on a phone or a tablet-sized window
 */
export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => narrowQuery()?.matches ?? false,
    () => false,
  );
}
