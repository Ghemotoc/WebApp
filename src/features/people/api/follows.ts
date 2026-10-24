/**
 * Follows: the follow state of a writer or a story, following and unfollowing, and the writer's
 * own list of followers (story S1-E6-05).
 *
 * Who calls it: hooks/useFollow.ts and hooks/useMyFollowers.ts.
 * What it calls next: writer_follow_state(), story_follow_state(), follow_writer(),
 * follow_story() and my_followers() (…_s1_e6_05_follows.sql). They take a username or a story's
 * address, never a user ID (architecture 1.6). A blocked pair silently stays "not following".
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** What a Follow button follows: a writer by username, or a story by its address. */
export type FollowTarget = { kind: 'writer'; handle: string } | { kind: 'story'; slug: string };

/** The public count and whether the reader follows. */
export interface FollowState {
  following: boolean;
  followerCount: number;
}

/** One person on the writer's own followers list. */
export interface Follower {
  handle: string;
  displayName: string;
  followedAt: string;
}

/** Why following failed, in words the button can explain. */
export type FollowFailure = 'read_only' | 'unreachable';

/** The error a refused follow throws. */
export class FollowError extends Error {
  constructor(public readonly failure: FollowFailure) {
    super(`Follow failed: ${failure}`);
  }
}

/** The JSON the follow functions answer. */
interface FollowStateRow {
  following: boolean;
  follower_count: number;
}

/**
 * Reads the follow state.
 *
 * @param client - the shared Supabase client
 * @param target - the writer or the story
 * @returns the state, or null when the reader may not see the target
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchFollowState(
  client: AppSupabaseClient,
  target: FollowTarget,
): Promise<FollowState | null> {
  const { data, error } =
    target.kind === 'writer'
      ? await client.rpc('writer_follow_state', { wanted_handle: target.handle })
      : await client.rpc('story_follow_state', { story_slug: target.slug });
  if (error !== null) throw new Error(`Could not read the follow state: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as FollowStateRow;
  return { following: row.following, followerCount: row.follower_count };
}

/**
 * Follows or unfollows.
 *
 * @param client - the shared Supabase client
 * @param target - the writer or the story
 * @param shouldFollow - true to follow, false to unfollow
 * @returns the state afterwards (a block leaves it "not following", with no error)
 * Errors: throws FollowError: read_only when the account may not follow (42501, the account
 *   gate), unreachable otherwise.
 */
export async function setFollow(
  client: AppSupabaseClient,
  target: FollowTarget,
  shouldFollow: boolean,
): Promise<FollowState> {
  const { data, error } =
    target.kind === 'writer'
      ? await client.rpc('follow_writer', {
          target_handle: target.handle,
          should_follow: shouldFollow,
        })
      : await client.rpc('follow_story', { story_slug: target.slug, should_follow: shouldFollow });
  if (error !== null) throw new FollowError(error.code === '42501' ? 'read_only' : 'unreachable');
  const row = data as unknown as FollowStateRow;
  return { following: row.following, followerCount: row.follower_count };
}

/**
 * Reads the signed-in writer's own followers (Q50: nobody else can).
 *
 * @param client - the shared Supabase client
 * @returns the followers, newest first
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyFollowers(client: AppSupabaseClient): Promise<Follower[]> {
  const { data, error } = await client.rpc('my_followers');
  if (error !== null) throw new Error(`Could not read your followers: ${error.message}`);
  return data.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    followedAt: row.followed_at,
  }));
}
