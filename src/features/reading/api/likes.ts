/**
 * Likes on a chapter: the public count, whether the reader likes it, and the toggle (story
 * S1-E6-03).
 *
 * Who calls it: hooks/useChapterLike.ts.
 * What it calls next: chapter_like_state() and like_chapter() (…_s1_e6_03_likes.sql). Both take
 * the chapter's address (story and chapter code), apply the reader's rules (rating, blocks,
 * moderation) and never return who liked.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The count and whether the reader likes the chapter. */
export interface LikeState {
  liked: boolean;
  likeCount: number;
}

/** Why a like failed, in words the button can explain. */
export type LikeFailure = 'read_only' | 'unreachable';

/** The error a refused like throws. */
export class LikeError extends Error {
  constructor(public readonly failure: LikeFailure) {
    super(`Like failed: ${failure}`);
  }
}

/** The JSON both functions answer. */
interface LikeStateRow {
  liked: boolean;
  like_count: number;
}

/** A chapter by its address. */
export interface ChapterAddress {
  storySlug: string;
  chapterCode: string;
}

/**
 * Turns the database's JSON into a LikeState.
 *
 * @param row - the answer
 * @returns the state
 */
function likeStateFrom(row: LikeStateRow): LikeState {
  return { liked: row.liked, likeCount: row.like_count };
}

/**
 * Reads the like state.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns the state, or null when the reader may not read the chapter
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchLikeState(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<LikeState | null> {
  const { data, error } = await client.rpc('chapter_like_state', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the likes: ${error.message}`);
  if (data === null) return null;
  return likeStateFrom(data as unknown as LikeStateRow);
}

/**
 * Likes the chapter or takes the like back.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param shouldLike - true to like, false to take it back
 * @returns the state afterwards
 * Errors: throws LikeError: read_only when the account may not like (42501, the account gate),
 *   unreachable otherwise.
 */
export async function setLike(
  client: AppSupabaseClient,
  address: ChapterAddress,
  shouldLike: boolean,
): Promise<LikeState> {
  const { data, error } = await client.rpc('like_chapter', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    should_like: shouldLike,
  });
  if (error !== null) throw new LikeError(error.code === '42501' ? 'read_only' : 'unreachable');
  return likeStateFrom(data as unknown as LikeStateRow);
}
