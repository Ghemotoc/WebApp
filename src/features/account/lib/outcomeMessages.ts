/**
 * Turns a username or pen name outcome into the sentence shown under the field (story S1-E2-04).
 *
 * Who calls it: HandleField and PenNameField. The sentences are in src/locales/<language>/
 * account.json (handle.outcomes and penName.outcomes), in both languages (CLAUDE.md rule 4).
 */
import type { TFunction } from 'i18next';

import type { HandleOutcome, PenNameOutcome } from './nameRules';

/** Outcomes that a moderator could reverse, so the field offers to ask for a review. */
const reviewableOutcomes = new Set<string>(['looks_like_staff', 'not_allowed']);

/**
 * The sentence for a refusal.
 *
 * @param t - the account namespace's translate function
 * @param kind - which name
 * @param outcome - the refusal (never 'ok')
 * @param waitingDays - the days between changes, for 'too_soon'
 * @returns the sentence
 */
export function refusalMessage(
  t: TFunction<'account'>,
  kind: 'handle' | 'penName',
  outcome: Exclude<HandleOutcome | PenNameOutcome, 'ok'>,
  waitingDays: number,
): string {
  return t(`${kind}.outcomes.${outcome}`, { days: waitingDays });
}

/**
 * Says whether a moderator could approve the name (a false hit, such as a surname).
 *
 * @param outcome - the answer
 * @returns true for the word-list refusals
 */
export function canAskForReview(outcome: HandleOutcome | PenNameOutcome | null): boolean {
  return outcome !== null && reviewableOutcomes.has(outcome);
}
