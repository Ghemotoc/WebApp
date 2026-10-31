/**
 * One paragraph's comments, for the thread that opens under it (story S1-E6-06; board 3.5).
 *
 * Who calls it: hooks/useParagraphComments.ts.
 * What it calls next: paragraph_comments() (…_s1_e6_06_paragraph_comments.sql), which applies
 * the reader's rules (rating, blocks, moderation) and never answers a user ID. Posting goes
 * through postComment() in api/comments.ts, with the paragraph's number.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterAddress } from '@/features/reading/api/likes';
import type { ParagraphPlace } from '@/features/reading/api/paragraphComments';

import { commentFrom, type ChapterComment, type CommentsPageRow } from './comments';

/** One paragraph's thread. */
export interface ParagraphThread {
  /** Every comment and reply the reader may read on it, for the heading. */
  total: number;
  /** Newest first, each with its replies. */
  comments: ChapterComment[];
}

/**
 * Reads one paragraph's thread.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param place - the paragraph's number, or 'earlier' for the comments on an earlier version
 * @returns the thread, or null when the reader may not read the chapter
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchParagraphThread(
  client: AppSupabaseClient,
  address: ChapterAddress,
  place: ParagraphPlace,
): Promise<ParagraphThread | null> {
  const { data, error } = await client.rpc('paragraph_comments', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    // Left out, the database answers the comments on an earlier version.
    ...(place === 'earlier' ? {} : { block_number: place }),
  });
  if (error !== null) throw new Error(`Could not read the paragraph's comments: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as CommentsPageRow;
  return { total: row.total, comments: row.comments.map(commentFrom) };
}
