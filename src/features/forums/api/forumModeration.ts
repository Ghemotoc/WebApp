/**
 * Moderators pin and lock forum threads (bundle FORUMS-1, part e; story S1-E8-05).
 *
 * Who calls it: hooks/useForumModeration.ts, for the moderator tools on the thread page
 * (ThreadModeration). What it calls next: admin_set_forum_thread_sticky(),
 * admin_lock_forum_thread() and admin_unlock_forum_thread() in
 * supabase/migrations/…_forums1_e_sticky_and_locked.sql. Each checks the moderation permission
 * on the server and writes the audit log in the same transaction (architecture 1.8.1): the
 * tools showing on screen is a convenience, never the protection.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a moderator's change. */
export type ModerationFailure =
  'not_allowed' | 'reason_empty' | 'reason_too_long' | 'gone' | 'unreachable';

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
 * @returns not_allowed (42501), reason_empty or reason_too_long (23514, by hint), gone (P0002),
 *   otherwise unreachable
 */
export function moderationErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): ForumModerationError {
  if (error.code === '42501') return new ForumModerationError('not_allowed');
  if (error.code === 'P0002') return new ForumModerationError('gone');
  if (error.code === '23514' && error.hint === 'reason:empty')
    return new ForumModerationError('reason_empty');
  if (error.code === '23514' && error.hint === 'reason:too_long')
    return new ForumModerationError('reason_too_long');
  return new ForumModerationError('unreachable');
}

/** One moderator change to a thread. */
export interface ThreadModeration {
  /** sticky and unsticky pin and unpin it; lock and unlock open and close it for replies. */
  action: 'sticky' | 'unsticky' | 'lock' | 'unlock';
  threadNumber: number;
  /** Why; for the audit log, and shown on the thread when it is locked. */
  reason: string;
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
  // Step 1: each action is its own server function, so the audit log names it exactly.
  const where = { thread_number: change.threadNumber, reason: change.reason };
  let result;
  if (change.action === 'lock') {
    result = await client.rpc('admin_lock_forum_thread', where);
  } else if (change.action === 'unlock') {
    result = await client.rpc('admin_unlock_forum_thread', where);
  } else {
    const isSticky = change.action === 'sticky';
    result = await client.rpc('admin_set_forum_thread_sticky', { ...where, is_sticky: isSticky });
  }
  // Step 2: a refusal becomes words the moderator can act on.
  if (result.error) throw moderationErrorFrom(result.error);
}
