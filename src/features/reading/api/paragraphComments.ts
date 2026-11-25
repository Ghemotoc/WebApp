/**
 * How many comments each paragraph of a chapter has, for the markers beside the text (story
 * S1-E6-06; board 3.5).
 *
 * Who calls it: hooks/useParagraphCommentCounts.ts.
 * What it calls next: paragraph_comment_counts() (…_s1_e6_06_paragraph_comments.sql), which
 * applies the reader's rules (rating, blocks, moderation) and never answers a user ID. The
 * thread itself (the comments and posting) is in src/features/comments/api/paragraphComments.ts,
 * fetched only when a reader opens a marker, so the reader stays inside its script budget.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterAddress } from './likes';

/** Where a paragraph thread is: a paragraph's number, or the comments on an earlier version. */
export type ParagraphPlace = number | 'earlier';

/** The counts beside the text. */
/**
 * Words readers chose and commented on that are still in the chapter (READER-SELECT, board B13):
 * where they are today and how many comments and replies are on them. The text underlines them.
 */
export interface CommentPart {
  /** The paragraph they start in today, from 1; their comments are in its panel. */
  block: number;
  /** The paragraph they end in today. */
  endBlock: number;
  startOffset: number;
  endOffset: number;
  /** The words, as the reader chose them. */
  quote: string;
  count: number;
}

export interface ParagraphCounts {
  /** False when the writer has turned comments off: no markers at all. */
  commentsEnabled: boolean;
  /** Comments (replies included) by paragraph number; a paragraph without any is left out. */
  byParagraph: Record<number, number>;
  /** Comments left on paragraphs the writer has since changed or taken out. */
  earlier: number;
  /**
   * When the writer's pause of new comments ends (CALM-8), or null when none runs: during it a
   * paragraph without comments shows no marker, as nobody can start a thread there; a count
   * still opens its thread for reading.
   */
  commentsPausedUntil: string | null;
  /** The chosen words still in the text, in text order (READER-SELECT); empty when none. */
  parts: CommentPart[];
}

/** One set of chosen words as paragraph_comment_counts() sends it. */
interface CommentPartRow {
  block: number;
  end_block: number;
  start_offset: number;
  end_offset: number;
  quote: string;
  count: number;
}

/** The JSON paragraph_comment_counts() answers; comments_paused_until only while a pause runs. */
interface ParagraphCountsRow {
  comments_enabled: boolean;
  paragraphs: { block: number; count: number }[];
  earlier: number;
  comments_paused_until?: string | null;
  parts?: CommentPartRow[];
}

/**
 * Turns one set of chosen words' JSON into a CommentPart.
 *
 * @param row - the words as the database sends them
 * @returns the part
 */
function partFrom(row: CommentPartRow): CommentPart {
  return {
    block: row.block,
    endBlock: row.end_block,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    quote: row.quote,
    count: row.count,
  };
}

/**
 * The cache key for one chapter's paragraph counts. It starts with the comments list's key
 * (commentsQueryKey() in src/features/comments/hooks/useChapterComments.ts), so posting,
 * deleting or reacting anywhere on the chapter refreshes the counts as well.
 *
 * @param address - the chapter
 * @param userId - the signed-in person (what each person may read differs: blocks)
 * @returns the key
 */
export function paragraphCountsQueryKey(address: ChapterAddress, userId: string | null) {
  return ['chapter-comments', address.storySlug, address.chapterCode, userId, 'paragraph-counts'];
}

/**
 * Reads the counts.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns the counts, or null when the reader may not read the chapter
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchParagraphCounts(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<ParagraphCounts | null> {
  const { data, error } = await client.rpc('paragraph_comment_counts', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the paragraph comments: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as ParagraphCountsRow;
  // Step: the list becomes a lookup by paragraph number, which each marker reads.
  const byParagraph: Record<number, number> = {};
  for (const paragraph of row.paragraphs) byParagraph[paragraph.block] = paragraph.count;
  return {
    commentsEnabled: row.comments_enabled,
    byParagraph,
    earlier: row.earlier,
    commentsPausedUntil: row.comments_paused_until ?? null,
    parts: (row.parts ?? []).map(partFrom),
  };
}
