/**
 * A space's moderators hide a reply, show it again or move it to another thread of the space
 * (bundle GAPS-10; story S1-E8-07; design/boards/Space.dc.html: "Hide and move posts").
 *
 * Who calls it: hooks/useSpacePostModeration.ts, for the "Moderate" tools under a reply
 * (PostSpaceModeration). What it calls next: space_hide_forum_post(), space_show_forum_post() and
 * space_move_forum_post() in supabase/migrations/…_gaps10_space_post_moderation.sql. Each checks
 * on the server that the caller is the space's owner or one of its moderators with the threads
 * power, and writes the space's log in the same transaction (architecture 1.8.1): the tools
 * showing on screen is a convenience, never the protection.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a change. */
export type SpacePostFailure =
  | 'not_allowed'
  | 'owner'
  | 'first'
  | 'reason_empty'
  | 'reason_too_long'
  | 'gone'
  | 'already'
  | 'not_hidden'
  | 'by_team'
  | 'target_missing'
  | 'target_same'
  | 'target_locked'
  | 'unreachable';

/** The refusals the database names with a hint. */
const failuresByHint: Record<string, SpacePostFailure> = {
  'post:owner': 'owner',
  'post:first': 'first',
  'post:missing': 'gone',
  'post:already': 'already',
  'post:not_hidden': 'not_hidden',
  'post:by_team': 'by_team',
  'reason:empty': 'reason_empty',
  'reason:too_long': 'reason_too_long',
  'target:missing': 'target_missing',
  'target:same': 'target_same',
  'target:locked': 'target_locked',
};

/** The error a refused change throws. */
export class SpacePostModerationError extends Error {
  /** @param failure - why it was refused */
  constructor(readonly failure: SpacePostFailure) {
    super(`The space refused the change: ${failure}`);
    this.name = 'SpacePostModerationError';
  }
}

/**
 * Turns a database error into a SpacePostModerationError.
 *
 * @param error - Postgres's code and hint
 * @returns the failure the hint names; not_allowed for 42501 without a hint; otherwise unreachable
 */
export function spacePostErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): SpacePostModerationError {
  // The hint says exactly what was wrong, so it is read before the code.
  const named = failuresByHint[error.hint ?? ''];
  if (named !== undefined) return new SpacePostModerationError(named);
  if (error.code === '42501') return new SpacePostModerationError('not_allowed');
  return new SpacePostModerationError('unreachable');
}

/** One change to a reply in a space. */
export interface SpacePostChange {
  /** hide takes it away from readers; show brings it back; move sends it to toThreadNumber. */
  action: 'hide' | 'show' | 'move';
  postId: string;
  /** Why; it goes in the space's log. */
  reason: string;
  /** For "move": the thread of the same space that takes the reply. */
  toThreadNumber?: number;
}

/**
 * Calls the server function for one change.
 *
 * @param client - the Supabase client
 * @param change - what to do, to which reply, and why
 * @returns the database's answer
 */
function callFor(client: AppSupabaseClient, change: SpacePostChange) {
  // Each action is its own server function, so the space's log names it exactly.
  const where = { post_id: change.postId, reason: change.reason };
  switch (change.action) {
    case 'hide':
      return client.rpc('space_hide_forum_post', where);
    case 'show':
      return client.rpc('space_show_forum_post', where);
    case 'move':
      return client.rpc('space_move_forum_post', {
        ...where,
        to_thread_number: change.toThreadNumber ?? 0,
      });
  }
}

/** Where a moved reply is now. */
export interface MovedPostPlace {
  threadNumber: number;
  postNumber: number;
}

/**
 * Reads space_move_forum_post()'s answer.
 *
 * @param data - {thread_number, post_number}
 * @returns the reply's new place, or null when the answer isn't one (hide and show answer nothing)
 */
function placeFrom(data: unknown): MovedPostPlace | null {
  if (typeof data !== 'object' || data === null) return null;
  const row = data as Record<string, unknown>;
  const threadNumber = row['thread_number'];
  const postNumber = row['post_number'];
  if (typeof threadNumber !== 'number' || typeof postNumber !== 'number') return null;
  return { threadNumber, postNumber };
}

/**
 * Makes one change to a reply in a space.
 *
 * @param client - the Supabase client
 * @param change - what to do, to which reply, and why
 * @returns for a move, where the reply is now; otherwise null
 * @throws SpacePostModerationError when refused
 */
export async function moderateSpacePost(
  client: AppSupabaseClient,
  change: SpacePostChange,
): Promise<MovedPostPlace | null> {
  const result = await callFor(client, change);
  // A refusal becomes words the moderator can act on.
  if (result.error) throw spacePostErrorFrom(result.error);
  return change.action === 'move' ? placeFrom(result.data) : null;
}
