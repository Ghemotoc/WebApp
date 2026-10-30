/**
 * The failure a settings screen shows, from what a query or an action threw (story S1-E11-03).
 *
 * Who calls it: every hook in this folder.
 */
import { SettingsAdminError, type SettingsFailure } from '../api/settingsAdmin';

/** What went wrong, and the database's reason word when it gave one. */
export interface ShownFailure {
  failure: SettingsFailure;
  reason: string | null;
}

/**
 * The failure to show, or none.
 *
 * @param hasFailed - whether the query or action failed
 * @param error - what it threw
 * @returns the failure and its reason, or null
 */
export function shownFailureOf(hasFailed: boolean, error: unknown): ShownFailure | null {
  if (!hasFailed) return null;
  if (error instanceof SettingsAdminError) return { failure: error.failure, reason: error.reason };
  return { failure: 'unreachable', reason: null };
}
