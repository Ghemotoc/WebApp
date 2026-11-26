/**
 * Likes on a whole story: the public count, whether the reader likes it, and the toggle (bundle 2,
 * board B01: the "Like" button in the story page's row; Robert pressed "As drawn on the canvas",
 * 24 Nov 2026).
 *
 * Who calls it: hooks/useStoryLike.ts.
 * What it calls next: story_like_state() and like_story() (…_books2_story_likes.sql). Both take
 * the story's address, apply the story page's rules (rating, blocks, moderation, country) and
 * never return who liked. A like on a translation lands on the first edition, so every edition
 * shows one total. Chapter likes stay on their chapters (api/likes.ts).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { LikeError, type LikeState } from './likes';

/** The JSON both functions answer. */
interface StoryLikeStateRow {
  liked: boolean;
  like_count: number;
}

/**
 * Turns the database's JSON into a LikeState.
 *
 * @param row - the answer
 * @returns the state
 */
function likeStateFrom(row: StoryLikeStateRow): LikeState {
  return { liked: row.liked, likeCount: row.like_count };
}

/**
 * Reads a story's like state.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the state, or null when the reader may not see the story
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryLikeState(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<LikeState | null> {
  const { data, error } = await client.rpc('story_like_state', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the story's likes: ${error.message}`);
  if (data === null) return null;
  return likeStateFrom(data as unknown as StoryLikeStateRow);
}

/**
 * Likes the story or takes the like back.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param shouldLike - true to like, false to take it back
 * @returns the state afterwards
 * Errors: throws LikeError: read_only when the account may not like (42501, the account gate),
 *   unreachable otherwise.
 */
export async function setStoryLike(
  client: AppSupabaseClient,
  storySlug: string,
  shouldLike: boolean,
): Promise<LikeState> {
  const { data, error } = await client.rpc('like_story', {
    story_slug: storySlug,
    should_like: shouldLike,
  });
  if (error !== null) throw new LikeError(error.code === '42501' ? 'read_only' : 'unreachable');
  return likeStateFrom(data as unknown as StoryLikeStateRow);
}
