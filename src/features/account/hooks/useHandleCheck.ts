/**
 * useHandleCheck: the live "is this username free?" answer under the username field (story
 * S1-E2-04; board 2.5: "@lia.writes is free.").
 *
 * Who calls it: HandleField.
 * What it calls: lib/nameRules.ts for the rules that need no lists (length, spaces, invisible
 * characters), answered at once; then, after the person stops typing for a moment,
 * api/accountNames.ts → check_handle() for the rest (staff, brand and swearwords, look-alikes,
 * taken).
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { checkHandle } from '../api/accountNames';
import { quickHandleProblem, type HandleOutcome } from '../lib/nameRules';

import { requireClient } from './useMyNames';

/** How long to wait after the last key press before asking the database, in milliseconds. */
const typingPause = 400;

/** What the field shows. */
export interface HandleCheck {
  /** The answer for the text on screen, or null while it isn't known yet (or nothing changed). */
  outcome: HandleOutcome | null;
  /** True while the database is being asked. */
  isChecking: boolean;
  /** True when the database couldn't be reached; saving will still check. */
  checkFailed: boolean;
}

/**
 * Keeps the value that was on screen when the person stopped typing.
 *
 * @param value - the text as typed
 * @returns the same text, a short pause later
 */
function useValueAfterPause(value: string): string {
  const [pausedValue, setPausedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setPausedValue(value), typingPause);
    return () => window.clearTimeout(timer);
  }, [value]);
  return pausedValue;
}

/** An answer with nothing to say yet, or a refusal the form found itself. */
const quietCheck = (outcome: HandleOutcome | null): HandleCheck => ({
  outcome,
  isChecking: false,
  checkFailed: false,
});

/**
 * Checks a username as it is typed.
 *
 * @param candidate - the username as typed
 * @param currentHandle - the person's username now (null before setup); it needs no check
 * @returns the answer to show
 */
export function useHandleCheck(candidate: string, currentHandle: string | null): HandleCheck {
  const pausedCandidate = useValueAfterPause(candidate);
  // Step 1: nothing typed, the person's own username, or a rule the form can answer at once.
  const isUnchanged = candidate === '' || candidate === currentHandle;
  const quickProblem = isUnchanged ? null : quickHandleProblem(candidate);
  // Step 2: ask the database only for a new name that passed the quick rules, once typing pauses.
  const isPaused = pausedCandidate === candidate;
  const needsDatabase = !isUnchanged && quickProblem === null && isPaused;
  const databaseCheck = useQuery<HandleOutcome>({
    queryKey: ['handle-check', pausedCandidate],
    enabled: needsDatabase,
    queryFn: async () => checkHandle(await requireClient(), pausedCandidate),
  });

  // Step 3: the answer to show.
  if (isUnchanged || quickProblem !== null) return quietCheck(quickProblem);
  if (!needsDatabase) return { outcome: null, isChecking: true, checkFailed: false };
  return {
    outcome: databaseCheck.data ?? null,
    isChecking: databaseCheck.isPending,
    checkFailed: databaseCheck.isError,
  };
}
