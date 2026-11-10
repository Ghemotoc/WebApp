/**
 * Moderators pin and lock forum threads (bundle FORUMS-1, part e; story S1-E8-05). GAPS-9 adds
 * making a thread its forum's rules thread and pointing a locked thread at the next one.
 *
 * Who calls it: hooks/useForumModeration.ts, for the moderator tools on the thread page
 * (ThreadModeration). What it calls next: admin_set_forum_thread_sticky(),
 * admin_lock_forum_thread() and admin_unlock_forum_thread() in
 * supabase/migrations/…_forums1_e_sticky_and_locked.sql, and admin_set_forum_rules_thread() and
 * admin_set_forum_thread_next() in …_gaps9_forum_rules_and_pointers.sql. Each checks the moderation permission
 * on the server and writes the audit log in the same transaction (architecture 1.8.1): the
 * tools showing on screen is a convenience, never the protection.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a moderator's change. */
export type ModerationFailure =
  | 'not_allowed'
  | 'reason_empty'
  | 'reason_too_long'
  | 'gone'
  | 'not_locked'
  | 'next_missing'
  | 'next_same'
  | 'unreachable';

/** The refusals the database names with a hint, by "code hint". */
const failuresByHint: Record<string, ModerationFailure> = {
  '23514 reason:empty': 'reason_empty',
  '23514 reason:too_long': 'reason_too_long',
  '23514 thread:not_locked': 'not_locked',
  '23514 next:same': 'next_same',
  'P0002 next:missing': 'next_missing',
};

/** The error a refused change throws. */
export class ForumModerationError extends Error {
  /** @param failure - why it was refused */
  constructor(readonly failure: ModerationFailure) {
    super(`The forum refused the change: ${failure}`);
    this.name = 'ForumModerationError';
  }
}

/**
 * Turns a database error into a ForumModerationError.
 *
 * @param error - Postgres's code and hint
 * @returns not_allowed (42501); reason_empty, reason_too_long, not_locked, next_same or
 *   next_missing (by hint); gone (P0002 without that hint); otherwise unreachable
 */
export function moderationErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): ForumModerationError {
  if (error.code === '42501') return new ForumModerationError('not_allowed');
  const named = failuresByHint[`${error.code ?? ''} ${error.hint ?? ''}`];
  if (named !== undefined) return new ForumModerationError(named);
  if (error.code === 'P0002') return new ForumModerationError('gone');
  return new ForumModerationError('unreachable');
}

/** One moderator change to a thread. */
export interface ThreadModeration {
  /**
   * sticky and unsticky pin and unpin it; lock and unlock open and close it for replies; rules
   * and unrules make it the forum's rules thread or stop that; next points a locked thread at
   * nextThreadNumber and unnext takes the pointer away (GAPS-9).
   */
  action: 'sticky' | 'unsticky' | 'lock' | 'unlock' | 'rules' | 'unrules' | 'next' | 'unnext';
  threadNumber: number;
  /** Why; for the audit log, and shown on the thread when it is locked. */
  reason: string;
  /** For "next": the thread where the conversation carries on. */
  nextThreadNumber?: number;
}

/**
 * Calls the server function for one change.
 *
 * @param client - the Supabase client
 * @param change - what to do, to which thread, and why
 * @returns the database's answer
 */
function callFor(client: AppSupabaseClient, change: ThreadModeration) {
  // Each action is its own server function, so the audit log names it exactly.
  const where = { thread_number: change.threadNumber, reason: change.reason };
  switch (change.action) {
    case 'lock':
      return client.rpc('admin_lock_forum_thread', where);
    case 'unlock':
      return client.rpc('admin_unlock_forum_thread', where);
    case 'sticky':
    case 'unsticky':
      return client.rpc('admin_set_forum_thread_sticky', {
        ...where,
        is_sticky: change.action === 'sticky',
      });
    case 'rules':
    case 'unrules':
      return client.rpc('admin_set_forum_rules_thread', {
        ...where,
        is_rules: change.action === 'rules',
      });
    case 'next':
      return client.rpc('admin_set_forum_thread_next', {
        ...where,
        next_thread_number: change.nextThreadNumber,
      });
    case 'unnext':
      // Naming no thread takes the pointer away.
      return client.rpc('admin_set_forum_thread_next', where);
  }
}

/**
 * Makes one moderator change to a thread.
 *
 * @param client - the Supabase client
 * @param change - what to do, to which thread, and why
 * @throws ForumModerationError when refused
 */
export async function moderateThread(
  client: AppSupabaseClient,
  change: ThreadModeration,
): Promise<void> {
  const result = await callFor(client, change);
  // A refusal becomes words the moderator can act on.
  if (result.error) throw moderationErrorFrom(result.error);
}
