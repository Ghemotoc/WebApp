/**
 * Private downvotes on a comment (story S1-E6-04; Q22: private, for moderation only).
 *
 * Who calls it: hooks/useDownvoteComment.ts (DownvoteButton). What it calls next:
 * downvote_comment() (…_s1_e6_04_downvotes.sql), which checks the reader may read the comment,
 * refuses their own, and for adding one the account gate. Nothing here, or anywhere, answers a
 * downvote count: the reader only learns whether they downvoted it themselves.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { commentErrorFrom } from './comments';

/**
 * Adds or takes away the reader's downvote.
 *
 * @param client - the shared Supabase client
 * @param commentId - the comment
 * @param shouldDownvote - true to add it, false to take it away
 * @returns whether the reader has a downvote on it afterwards
 * Errors: throws CommentError: read_only (signed out, or the account may not write), refused
 *   (their own comment), gone (the comment isn't there for this reader), unreachable.
 */
export async function downvoteComment(
  client: AppSupabaseClient,
  commentId: string,
  shouldDownvote: boolean,
): Promise<boolean> {
  const { data, error } = await client.rpc('downvote_comment', {
    comment_id: commentId,
    should_downvote: shouldDownvote,
  });
  if (error !== null) throw commentErrorFrom(error);
  return data === true;
}
