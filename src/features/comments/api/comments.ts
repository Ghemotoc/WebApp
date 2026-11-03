/**
 * Comments on a chapter: reading a page, posting, replying and deleting (story S1-E6-01). A
 * comment can also be on one paragraph (S1-E6-06): it carries which one, and postComment sends
 * it through post_paragraph_comment().
 * Each comment also carries its reactions (S1-E6-02, api/reactions.ts) and whether the reader
 * downvoted it (S1-E6-04, api/downvotes.ts).
 *
 * Who calls it: hooks/useChapterComments.ts and hooks/useCommentActions.ts.
 * What it calls next: chapter_comments(), post_comment() and delete_comment()
 * (…_s1_e6_01_comments.sql). Every call takes the chapter's address and applies the reader's
 * rules (rating, blocks, moderation) in the database; none answers a user ID. The comment text is
 * sent and never logged here (CLAUDE.md rule 12).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterAddress } from '@/features/reading/api/likes';

import type { CommentReactions, ReactionsRow } from './reactions';

/** What the reader sees in a comment's place (comment_state_for_caller()). */
export type CommentState = 'live' | 'hidden' | 'removed' | 'deleted';

/** One comment as the comments area draws it. */
export interface ChapterComment {
  id: string;
  author: { handle: string; displayName: string };
  /** True when the author wrote the story ("Writer" pill). */
  isWriter: boolean;
  isMine: boolean;
  createdAt: string;
  isSpoiler: boolean;
  state: CommentState;
  /** The words, only for a live comment or the author's own hidden one. */
  body: string | null;
  canDelete: boolean;
  /** The reaction counts and the reader's own (S1-E6-02); empty on a marker. */
  reactions: CommentReactions;
  /** Whether the reader downvoted it (S1-E6-04). Only their own vote: nobody gets a count. */
  isDownvotedByMe: boolean;
  /** Replies, oldest first; always empty on a reply (one level deep). */
  replies: ChapterComment[];
  /**
   * The paragraph it is on today (S1-E6-06): its number, 'earlier' when the writer has since
   * changed that paragraph, or null for the whole chapter (and inside a paragraph's own thread).
   */
  paragraph: number | 'earlier' | null;
}

/** One page of comments, newest first. */
export interface CommentsPage {
  commentsEnabled: boolean;
  /** Every comment and reply the reader may read, for the heading. */
  total: number;
  hasMore: boolean;
  comments: ChapterComment[];
}

/** Why posting or deleting failed, in words the screen can explain. */
export type CommentFailure =
  | 'read_only'
  | 'too_many'
  | 'too_many_links'
  | 'too_long'
  | 'comments_off'
  | 'refused'
  | 'gone'
  | 'unreachable';

/** The error a refused comment throws; waitMinutes is set for too_many. */
export class CommentError extends Error {
  constructor(
    public readonly failure: CommentFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Comment failed: ${failure}`);
  }
}

/** The JSON one comment arrives as. */
export interface CommentRow {
  id: string;
  author: { handle: string; display_name: string };
  is_writer: boolean;
  is_mine: boolean;
  created_at: string;
  is_spoiler: boolean;
  state: CommentState;
  body: string | null;
  can_delete: boolean;
  reactions?: ReactionsRow;
  downvoted_by_me?: boolean;
  replies?: CommentRow[];
  paragraph?: number | 'earlier' | null;
}

/** The JSON a page arrives as (chapter_comments() and paragraph_comments()). */
export interface CommentsPageRow {
  comments_enabled: boolean;
  total: number;
  has_more: boolean;
  comments: CommentRow[];
}

/**
 * Turns one comment's JSON into a ChapterComment.
 *
 * @param row - the comment as the database sends it
 * @returns the comment, with its replies
 */
export function commentFrom(row: CommentRow): ChapterComment {
  return {
    id: row.id,
    author: { handle: row.author.handle, displayName: row.author.display_name },
    isWriter: row.is_writer,
    isMine: row.is_mine,
    createdAt: row.created_at,
    isSpoiler: row.is_spoiler,
    state: row.state,
    body: row.body,
    canDelete: row.can_delete,
    reactions: row.reactions ?? { counts: {}, mine: null },
    isDownvotedByMe: row.downvoted_by_me ?? false,
    replies: (row.replies ?? []).map(commentFrom),
    paragraph: row.paragraph ?? null,
  };
}

/**
 * Reads one page of a chapter's comments.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param olderThan - null for the first page; the last shown comment's createdAt for the next
 * @returns the page, or null when the reader may not read the chapter
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchCommentsPage(
  client: AppSupabaseClient,
  address: ChapterAddress,
  olderThan: string | null,
): Promise<CommentsPage | null> {
  const { data, error } = await client.rpc('chapter_comments', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    ...(olderThan === null ? {} : { older_than: olderThan }),
  });
  if (error !== null) throw new Error(`Could not read the comments: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as CommentsPageRow;
  return {
    commentsEnabled: row.comments_enabled,
    total: row.total,
    hasMore: row.has_more,
    comments: row.comments.map(commentFrom),
  };
}

/**
 * Which refusal a check_violation (23514) was.
 *
 * @param hint - the error's hint
 * @returns too_many_links when a new account put more than one link in a comment for its first
 *   day (S1-E10-12), too_long when a comment in a paragraph's thread is over its limit (hint
 *   "paragraph_too_long:<limit>"; Robert, 2 Nov 2026), otherwise refused (the text)
 */
function refusedErrorFrom(hint: string | null | undefined): CommentError {
  if (hint === 'too_many_links') return new CommentError('too_many_links');
  if (hint?.startsWith('paragraph_too_long') === true) return new CommentError('too_long');
  return new CommentError('refused');
}

/**
 * Turns a database error into a CommentError.
 *
 * @param error - Postgres's code and hint
 * @returns the error: read_only (42501), too_many with the minutes (54000, hint
 *   "wait_minutes:n"), comments_off (55000), too_many_links (23514 with the hint
 *   "too_many_links": a new account's comment with more than one link, S1-E10-12), too_long
 *   (23514 with the hint "paragraph_too_long:<limit>"), refused (23514: the text), gone (P0002), or
 *   unreachable
 */
export function commentErrorFrom(error: { code?: string; hint?: string | null }): CommentError {
  if (error.code === '42501') return new CommentError('read_only');
  if (error.code === '54000') {
    const minutes = Number((error.hint ?? '').replace('wait_minutes:', ''));
    return new CommentError('too_many', Number.isFinite(minutes) && minutes > 0 ? minutes : null);
  }
  if (error.code === '55000') return new CommentError('comments_off');
  if (error.code === '23514') return refusedErrorFrom(error.hint);
  if (error.code === 'P0002') return new CommentError('gone');
  return new CommentError('unreachable');
}

/** What a new comment or reply carries. */
export interface NewComment {
  body: string;
  isSpoiler: boolean;
  /** The top-level comment it answers, or null. */
  replyTo: string | null;
  /** The paragraph it is on (S1-E6-06), counted from 1; left out for the whole chapter. */
  paragraph?: number;
}

/**
 * Posts a comment on one paragraph (S1-E6-06).
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param comment - the text, the spoiler mark and the paragraph
 * @param paragraph - the paragraph's number, from 1
 * @returns the new comment's ID
 * Errors: throws CommentError (see commentErrorFrom; gone when the paragraph isn't there).
 */
async function postParagraphComment(
  client: AppSupabaseClient,
  address: ChapterAddress,
  comment: NewComment,
  paragraph: number,
): Promise<string> {
  const { data, error } = await client.rpc('post_paragraph_comment', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    block_number: paragraph,
    body: comment.body,
    is_spoiler: comment.isSpoiler,
  });
  if (error !== null) throw commentErrorFrom(error);
  return (data as unknown as { id: string }).id;
}

/**
 * Posts a comment, a reply, or a comment on one paragraph.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param comment - the text, the spoiler mark, what it answers and the paragraph, if any
 * @returns the new comment's ID
 * Errors: throws CommentError (see commentErrorFrom).
 */
export async function postComment(
  client: AppSupabaseClient,
  address: ChapterAddress,
  comment: NewComment,
): Promise<string> {
  // A comment on a paragraph has its own call; a reply goes through post_comment() and takes
  // its comment's paragraph in the database.
  if (comment.paragraph !== undefined && comment.replyTo === null) {
    return postParagraphComment(client, address, comment, comment.paragraph);
  }
  const { data, error } = await client.rpc('post_comment', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    body: comment.body,
    is_spoiler: comment.isSpoiler,
    ...(comment.replyTo === null ? {} : { reply_to: comment.replyTo }),
  });
  if (error !== null) throw commentErrorFrom(error);
  return (data as unknown as { id: string }).id;
}

/**
 * Deletes a comment (one's own, or any on one's own story).
 *
 * @param client - the shared Supabase client
 * @param commentId - the comment
 * Errors: throws CommentError: read_only when the caller may not, gone when it isn't there.
 */
export async function deleteComment(client: AppSupabaseClient, commentId: string): Promise<void> {
  const { error } = await client.rpc('delete_comment', { comment_id: commentId });
  if (error !== null) throw commentErrorFrom(error);
}
