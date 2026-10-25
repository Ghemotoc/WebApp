/**
 * Comments on a chapter: reading a page, posting, replying and deleting (story S1-E6-01).
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
  'read_only' | 'too_many' | 'comments_off' | 'refused' | 'gone' | 'unreachable';

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
interface CommentRow {
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
}

/** The JSON a page arrives as. */
interface CommentsPageRow {
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
 * Turns a database error into a CommentError.
 *
 * @param error - Postgres's code and hint
 * @returns the error: read_only (42501), too_many with the minutes (54000, hint
 *   "wait_minutes:n"), comments_off (55000), refused (23514: the text), gone (P0002), or
 *   unreachable
 */
export function commentErrorFrom(error: { code?: string; hint?: string | null }): CommentError {
  if (error.code === '42501') return new CommentError('read_only');
  if (error.code === '54000') {
    const minutes = Number((error.hint ?? '').replace('wait_minutes:', ''));
    return new CommentError('too_many', Number.isFinite(minutes) && minutes > 0 ? minutes : null);
  }
  if (error.code === '55000') return new CommentError('comments_off');
  if (error.code === '23514') return new CommentError('refused');
  if (error.code === 'P0002') return new CommentError('gone');
  return new CommentError('unreachable');
}

/** What a new comment or reply carries. */
export interface NewComment {
  body: string;
  isSpoiler: boolean;
  /** The top-level comment it answers, or null. */
  replyTo: string | null;
}

/**
 * Posts a comment or a reply.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param comment - the text, the spoiler mark and what it answers
 * @returns the new comment's ID
 * Errors: throws CommentError (see commentErrorFrom).
 */
export async function postComment(
  client: AppSupabaseClient,
  address: ChapterAddress,
  comment: NewComment,
): Promise<string> {
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
