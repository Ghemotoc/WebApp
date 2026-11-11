/**
 * The small rules of the Archived stories form (bundle ARCHIVE-1): what is wrong with a field,
 * and when the form is locked.
 *
 * Who calls it: components/ArchivedStoriesForm.tsx. What it calls: nothing.
 */
import type { ArchiveClaimOutcome } from '../api/storyArchive';

/** A year of birth is four digits, from 1900 on. */
const yearPattern = /^(19|20)\d{2}$/;

/** The translation key of each field's problem, or undefined when the field is fine. */
export interface ClaimFieldProblems {
  year: 'yearInvalid' | undefined;
  name: 'nameMissing' | undefined;
}

/**
 * Checks the two fields.
 *
 * @param birthYear - the year as typed
 * @param knownName - the pen name, username or title as typed
 * @returns the problem of each field, as a translation key
 */
export function claimFieldProblems(birthYear: string, knownName: string): ClaimFieldProblems {
  return {
    year: yearPattern.test(birthYear.trim()) ? undefined : 'yearInvalid',
    name: knownName.trim() === '' ? 'nameMissing' : undefined,
  };
}

/**
 * Says whether the form is locked: too many wrong tries before the page opened, or the last
 * wrong try just now (three wrong tries lock the form for a day).
 *
 * @param lockedAtStart - what my_story_archive() said when the page opened
 * @param outcome - the answer to the last try, if any
 * @returns true when the button must stay off
 */
export function isClaimLocked(
  lockedAtStart: boolean,
  outcome: ArchiveClaimOutcome | undefined,
): boolean {
  if (lockedAtStart) return true;
  if (outcome === undefined) return false;
  if (outcome.outcome === 'locked') return true;
  return outcome.outcome === 'no_match' && outcome.triesLeft === 0;
}
