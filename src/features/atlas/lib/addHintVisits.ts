/**
 * addHintVisits: whether the top bar's "New character" and "Add a relationship" still show their
 * words (user stories bundle 6, story 6.2: "The hints 'New character' and 'Add a relationship'
 * show for the first 3 visits, then fold away").
 *
 * A visit is one browser session that opens Story Atlas: the first Atlas page of a session adds
 * one to a count kept on this device, and the other pages of the same session add nothing. After
 * three visits the two buttons fold to their icons alone (their names stay for screen readers).
 * A per-device convenience only: the browser's storage can be empty, blocked or throw, so every
 * read and write is guarded, and without storage the words always show.
 * Who calls it: components/AtlasTopBar.tsx. What it calls: localStorage and sessionStorage.
 */

/** The storage key of the number of visits on this device. */
const visitCountKey = 'tmc-atlas-visits';

/** The session flag that says this session's visit is already counted. */
const countedThisSessionKey = 'tmc-atlas-visit-counted';

/** How many visits show the words (story 6.2). */
export const visitsWithHints = 3;

/**
 * Counts this session's visit once, and says how many visits there have been.
 *
 * @returns the number of visits, this one included; 0 when the browser keeps no storage
 */
export function countAtlasVisit(): number {
  try {
    const stored = Number(window.localStorage.getItem(visitCountKey) ?? '0');
    const visits = Number.isFinite(stored) ? stored : 0;
    // Step 1: a page later in the same session doesn't count again.
    if (window.sessionStorage.getItem(countedThisSessionKey) !== null) return visits;
    // Step 2: the session's first Atlas page counts one visit.
    window.sessionStorage.setItem(countedThisSessionKey, '1');
    window.localStorage.setItem(visitCountKey, String(visits + 1));
    return visits + 1;
  } catch {
    // Storage is off or full: the words keep showing, which is the safe side.
    return 0;
  }
}

/**
 * Whether the words still show.
 *
 * @param visits - the visits so far, from countAtlasVisit()
 * @returns true for the first three visits (and when storage is off)
 */
export function showsAddHints(visits: number): boolean {
  return visits <= visitsWithHints;
}
