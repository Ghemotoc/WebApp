/**
 * useAtlasHintsFolded: the Atlas's two "find me" adds, "New character" and "Add a relationship",
 * show with their words for a writer's first three visits, then fold to their icons (design books
 * review, item 18, "Hints that retire themselves": Saffer's long loop; the Atlas is the biggest
 * differentiator, so it must be easy to learn and then quiet).
 *
 * Folding keeps the buttons: only the words go, and they stay the buttons' accessible names, so a
 * screen reader hears the same thing on every visit.
 * A visit: the first time the Atlas opens in a browser session (a tab), so moving between Atlas
 * pages counts once. The count is per account (remembered_places, kind atlas_hint), so a new
 * device doesn't start the hints again. Whether this visit folds is decided once, from the count
 * before it, so the buttons never change under the writer's pointer mid-visit.
 * Who calls it: AtlasTopBar. What it calls: useRememberedPlace and sessionStorage.
 */
import { useEffect, useState } from 'react';

import type { Json } from '@/lib/database.types';
import { useRememberedPlace } from '@/lib/remembered/useRememberedPlace';

/** The hint's name in remembered_places. */
const HINT_KEY = 'atlas-top-adds';

/** How many visits show the words (design books item 18: "the first three visits"). */
export const VISITS_WITH_WORDS = 3;

/** The session note saying this visit has been counted, and whether it folds. */
const SESSION_KEY = 'atlas-hints-this-visit';

/** The decision for this visit when sessionStorage is blocked: kept for the page's life. */
let decisionWithoutStorage: boolean | null = null;

/** The visits counted so far, from a stored place ({ visits }). */
function visitsIn(place: Json | null): number {
  if (place === null || typeof place !== 'object' || Array.isArray(place)) return 0;
  const visits = place.visits;
  return typeof visits === 'number' && visits >= 0 ? visits : 0;
}

/** This visit's decision, if it was made already: true folds, false shows the words. */
function readDecision(): boolean | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored === null) return decisionWithoutStorage;
    return stored === 'folded';
  } catch {
    return decisionWithoutStorage;
  }
}

/** Keeps this visit's decision for the rest of the session. */
function writeDecision(isFolded: boolean): void {
  decisionWithoutStorage = isFolded;
  try {
    window.sessionStorage.setItem(SESSION_KEY, isFolded ? 'folded' : 'words');
  } catch {
    // Blocked: the page-level note above stands in until a reload.
  }
}

/**
 * Says whether the Atlas adds show their words or only their icons on this visit.
 *
 * @returns true when the words fold away (from the fourth visit on)
 */
export function useAtlasHintsFolded(): boolean {
  const { place, isSettled, remember } = useRememberedPlace('atlas_hint', HINT_KEY);
  const [decision, setDecision] = useState<boolean | null>(readDecision);
  const visitsBefore = visitsIn(place);
  useEffect(() => {
    // Decide once per visit, from the account's count once it has answered.
    if (!isSettled || decision !== null) return;
    const isFolded = visitsBefore >= VISITS_WITH_WORDS;
    writeDecision(isFolded);
    setDecision(isFolded);
    remember({ visits: visitsBefore + 1 });
  }, [isSettled, decision, visitsBefore, remember]);
  // Until the account answers, the browser's copy of the count is the best guess.
  return decision ?? visitsBefore >= VISITS_WITH_WORDS;
}
