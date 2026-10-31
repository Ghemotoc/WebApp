/**
 * What the return page says after Yoti sends the person back (story S1-E2-08, part 08a).
 *
 * Who calls it: components/AgeCheckReturnPage.tsx. What it calls: nothing; it reads the person's
 * check and the address and picks one message.
 */
import type { MyAgeCheck } from '../api/ageCheck';

/** The return page's messages. */
export type ReturnOutcome =
  'checking' | 'cancelled' | 'adult' | 'teen' | 'teen_with_adult_year' | 'failed' | 'not_finished';

/**
 * Picks the return page's message.
 *
 * @param check - the person's check as my_age_check() answers it
 * @param wasCancelled - Yoti (or the stand-in) sent the person back with ?cancelled=1
 * @param hasWaitedLongEnough - the page stopped waiting for the result
 * @returns the message to show
 */
export function returnOutcome(
  check: MyAgeCheck,
  wasCancelled: boolean,
  hasWaitedLongEnough: boolean,
): ReturnOutcome {
  // Step 1: a stored result says it all (criterion 5).
  if (check.result === '18_or_over') return 'adult';
  // Criterion 6: an adult year with "13 or over" is offered the ID document route.
  if (check.result === '13_or_over') return check.canStart ? 'teen_with_adult_year' : 'teen';
  if (check.result === 'failed') return 'failed';
  // Step 2: still waiting for Yoti's notification, unless the person cancelled.
  if (wasCancelled) return 'cancelled';
  if (check.isChecking && !hasWaitedLongEnough) return 'checking';
  // Step 3: the session ended without a result (closed or expired, criterion 11).
  return 'not_finished';
}
