/**
 * Votes on forum posts (bundle GAPS-16, part c; stories S1-E8-02 and S1-E6-04; board 5.2, the
 * vote chip under every post).
 *
 * An upvote is counted in public; a downvote is private and only helps moderators find posts to
 * check (Q22). The database answers only the caller's own vote, never a downvote count.
 * Who calls it: hooks/usePostVote.ts. What it calls next: vote_forum_post() in
 * supabase/migrations/20270205100048_gaps16c_forum_post_votes.sql.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** A vote: up, down, or none. */
export type PostVote = 'up' | 'down' | null;

/** What to change: the post and the vote the member wants on it now. */
export interface VoteChange {
  postId: string;
  vote: PostVote;
}

/**
 * Sets, swaps or takes back the member's vote on a post.
 *
 * @param client - the Supabase client
 * @param change - the post and the wanted vote (null takes the vote back)
 * @returns the member's vote afterwards
 * @throws Error when the database refuses (signed out, an account that can't vote, the member's
 *   own post, a post that isn't there, a locked thread)
 */
export async function setPostVote(
  client: AppSupabaseClient,
  change: VoteChange,
): Promise<PostVote> {
  // Step 1: ask the database; it checks the post, the thread and the account.
  // The generated type for a nullable text argument is string, so "no vote" is sent as null
  // through a cast: the function's own check accepts it.
  const { data, error } = await client.rpc('vote_forum_post', {
    post_id: change.postId,
    vote: change.vote as string,
  });
  // Step 2: a refusal is passed on, so the vote row can say it didn't work.
  if (error) throw new Error(`Voting on the post failed: ${error.message}`);
  return data === 'up' || data === 'down' ? data : null;
}
