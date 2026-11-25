/**
 * useGridColumns: how many story cards a row of a See all grid holds right now (user stories 1.5,
 * 1.6 and 1.9; boards A05, A06 and A09: five cards from 1024 px, four from 600 px, two below).
 *
 * StoryGrid lays its cards out with CSS; this hook reads the same widths through the browser's
 * media queries, so the grid can put its banner between two full rows (lib/gridAdPlaces.ts). It
 * changes the moment the window is resized or a tablet is turned.
 * Who calls it: StoryGrid. What it calls: window.matchMedia.
 */
import { useSyncExternalStore } from 'react';

/** The grid's widths, widest first, with the cards a row each one holds (StoryGrid's classes). */
const columnsByWidth: readonly { query: string; columns: number }[] = [
  { query: '(min-width: 1024px)', columns: 5 },
  { query: '(min-width: 600px)', columns: 4 },
];

/** Below 600 px a row holds two cards. */
const narrowestColumns = 2;

/** Where the browser has no media queries (very old browsers), the computer layout is assumed. */
const columnsWithoutMediaQueries = 5;

/**
 * Whether this browser can answer media queries.
 *
 * @returns true when window.matchMedia exists
 */
function hasMediaQueries(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * The cards a row holds at the window's width right now.
 *
 * @returns 5, 4 or 2
 */
function currentColumns(): number {
  if (!hasMediaQueries()) return columnsWithoutMediaQueries;
  // Step 1: the widest width the window reaches decides the row.
  const match = columnsByWidth.find((width) => window.matchMedia(width.query).matches);
  // Step 2: narrower than every listed width, a phone's two cards.
  return match?.columns ?? narrowestColumns;
}

/**
 * Listens for the window crossing 600 or 1024 px.
 *
 * @param onChange - React's callback to read the value again
 * @returns a function that stops listening
 */
function subscribe(onChange: () => void): () => void {
  if (!hasMediaQueries()) return () => undefined;
  const queries = columnsByWidth.map((width) => window.matchMedia(width.query));
  queries.forEach((query) => query.addEventListener('change', onChange));
  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
}

/**
 * How many cards a row of the grid holds right now.
 *
 * @returns 5 on a computer, 4 on a tablet, 2 on a phone
 */
export function useGridColumns(): number {
  return useSyncExternalStore(subscribe, currentColumns, () => columnsWithoutMediaQueries);
}
