/**
 * Comments on a chapter: reading a page, posting, replying and deleting (story S1-E6-01). A
 * comment can also be on one paragraph (S1-E6-06): it carries which one, and postComment sends
 * it through post_paragraph_comment(). Since READER-SELECT (boards B12 to B14) a comment can be on
 * words the reader chose: it carries them as its quote, and postComment sends it through
 * post_passage_comment().
 * Each comment also carries its reactions (S1-E6-02, api/reactions.ts) and whether the reader
 * downvoted it (S1-E6-04, api/downvotes.ts). A page also says when a pause of new comments ends
 * while one runs (CALM-8, api/commentPause.ts), and a refused comment says until when.
 *
 * Who calls it: hooks/useChapterComments.ts and hooks/useCommentActions.ts.
 * What it calls next: chapter_comments(), post_comment() and delete_comment()
 * (…_s1_e6_01_comments.sql). Every call takes the chapter's address and applies the reader's
 * rules (rating, blocks, moderation) in the database; none answers a user ID. The comment text is
 * sent and never logged here (CLAUDE.md rule 12).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterAddress } from '@/features/reading/api/likes';

import { commentPauseFrom, type CommentPause, type CommentPauseRow } from './commentPause';
import type { CommentReactions, ReactionsRow } from './reactions';

/**
 * The words a comment is on (READER-SELECT, boards B12 to B14): what they say and where they are,
 * as when the comment was posted. Offsets count characters (UTF-16, as the browser counts them) in
 * the paragraph's text as the reader draws it; the end may be in a later paragraph.
 */
export interface CommentQuote {
  text: string;
  /** The paragraph the words start in, from 1. */
  startBlock: number;
  startOffset: number;
  /** The paragraph they end in: the same one, or a later one. */
  endBlock: number;
  endOffset: number;
}

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
  /** The words it is on (READER-SELECT), or null for a whole paragraph or the chapter. */
  quote: CommentQuote | null;
}

/** One page of comments, newest first. */
export interface CommentsPage {
  commentsEnabled: boolean;
  /**
   * False when the story takes comments from the writer's followers only and the reader isn't one
   * (MUST-1a): the page shows a line instead of the comment box. True for a visitor on Everyone.
   */
  audienceAllowsMe: boolean;
  /**
   * The writer's pause of new comments (CALM-8): while it runs the page shows "New comments are
   * paused until …" instead of the comment box, and no Reply.
   */
  pause: CommentPause;
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
  | 'quote_too_long'
  | 'quote_gone'
  | 'comments_off'
  | 'paused'
  | 'followers_only'
  | 'refused'
  | 'gone'
  | 'unreachable';

/**
 * The error a refused comment throws; waitMinutes is set for too_many, and pausedUntil (when new
 * comments open again, ISO time) for paused when the database said (CALM-8).
 */
export class CommentError extends Error {
  constructor(
    public readonly failure: CommentFailure,
    public readonly waitMinutes: number | null = null,
    public readonly pausedUntil: string | null = null,
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
  quote?: QuoteRow | null;
}

/** The JSON a comment's chosen words arrive as (comment_quote_json()). */
export interface QuoteRow {
  text: string;
  start_block: number;
  start_offset: number;
  end_block: number;
  end_offset: number;
}

/**
 * Turns the chosen words' JSON into a CommentQuote.
 *
 * @param row - the words as the database sends them, or nothing
 * @returns the quote, or null when the comment has none
 */
function quoteFrom(row: QuoteRow | null | undefined): CommentQuote | null {
  if (row === null || row === undefined) return null;
  return {
    text: row.text,
    startBlock: row.start_block,
    startOffset: row.start_offset,
    endBlock: row.end_block,
    endOffset: row.end_offset,
  };
}

/**
 * The JSON a page arrives as (chapter_comments() and paragraph_comments()); the pause's two fields
 * come only while a pause runs (CALM-8).
 */
export interface CommentsPageRow extends CommentPauseRow {
  comments_enabled: boolean;
  /** Left out when comments are off (MUST-1a). */
  audience_allows_me?: boolean;
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
    quote: quoteFrom(row.quote),
  };
}

/** The order a chapter's comments are listed in (BOOKS B05: the heading's choice). */
export type CommentOrder = 'newest' | 'oldest';

/** Which page to read: where it starts and in which order. */
export interface CommentsPageRequest {
  /** null for the first page; the last shown comment's createdAt for the next. */
  pageAfter: string | null;
  order: CommentOrder;
}

/**
 * Reads one page of a chapter's comments.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param page - where the page starts and the order (newest or oldest first)
 * @returns the page, or null when the reader may not read the chapter
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchCommentsPage(
  client: AppSupabaseClient,
  address: ChapterAddress,
  page: CommentsPageRequest,
): Promise<CommentsPage | null> {
  const { data, error } = await client.rpc('chapter_comments', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    oldest_first: page.order === 'oldest',
    ...(page.pageAfter === null ? {} : { page_after: page.pageAfter }),
  });
  if (error !== null) throw new Error(`Could not read the comments: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as CommentsPageRow;
  return {
    commentsEnabled: row.comments_enabled,
    audienceAllowsMe: row.audience_allows_me !== false,
    pause: commentPauseFrom(row),
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
  // READER-SELECT: more than 1,000 chosen characters, or words no longer in the chapter.
  if (hint === 'quote_too_long') return new CommentError('quote_too_long');
  if (hint === 'quote_not_found') return new CommentError('quote_gone');
  return new CommentError('refused');
}

/**
 * A refusal for who the caller is (42501): the story takes comments from the writer's followers
 * only (hint followers_only, MUST-1a), or the account can't comment yet.
 *
 * @param hint - the error's hint
 * @returns followers_only or read_only
 */
function notAllowedErrorFrom(hint: string | null | undefined): CommentError {
  if (hint === 'followers_only') return new CommentError('followers_only');
  return new CommentError('read_only');
}

/**
 * Which refusal an object_not_in_prerequisite_state (55000) was: the writer paused new comments
 * (hint "paused_until:<end>", CALM-8), or turned comments off.
 *
 * @param hint - the error's hint
 * @returns paused with the end, or comments_off
 */
function closedErrorFrom(hint: string | null | undefined): CommentError {
  if (hint?.startsWith('paused_until:') === true) {
    const end = hint.slice('paused_until:'.length);
    return new CommentError('paused', null, end === '' ? null : end);
  }
  return new CommentError('comments_off');
}

/**
 * Turns a database error into a CommentError.
 *
 * @param error - Postgres's code and hint
 * @returns the error: followers_only (42501 with that hint, MUST-1a), read_only (42501), too_many with the minutes (54000, hint
 *   "wait_minutes:n"), paused (55000 with the hint "paused_until:<end>", CALM-8), comments_off
 *   (55000), too_many_links (23514 with the hint
 *   "too_many_links": a new account's comment with more than one link, S1-E10-12), too_long
 *   (23514 with the hint "paragraph_too_long:<limit>"), quote_too_long and quote_gone (23514 with
 *   the hints "quote_too_long" and "quote_not_found", READER-SELECT), refused (23514: the text), gone (P0002), or
 *   unreachable
 */
export function commentErrorFrom(error: { code?: string; hint?: string | null }): CommentError {
  if (error.code === '42501') return notAllowedErrorFrom(error.hint);
  if (error.code === '54000') {
    const minutes = Number((error.hint ?? '').replace('wait_minutes:', ''));
    return new CommentError('too_many', Number.isFinite(minutes) && minutes > 0 ? minutes : null);
  }
  if (error.code === '55000') return closedErrorFrom(error.hint);
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
  /** The words it is on (READER-SELECT); its startBlock is then the paragraph. */
  quote?: CommentQuote;
}

/**
 * Posts a comment on words the reader chose (READER-SELECT, boards B12 to B14).
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param comment - the text and the spoiler mark
 * @param quote - the chosen words and where they are
 * @returns the new comment's ID
 * Errors: throws CommentError (see commentErrorFrom): quote_too_long over 1,000 characters,
 *   quote_gone when the words aren't in the chapter (any more), gone when a paragraph is missing.
 */
async function postPassageComment(
  client: AppSupabaseClient,
  address: ChapterAddress,
  comment: NewComment,
  quote: CommentQuote,
): Promise<string> {
  const { data, error } = await client.rpc('post_passage_comment', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    start_block: quote.startBlock,
    start_offset: quote.startOffset,
    end_block: quote.endBlock,
    end_offset: quote.endOffset,
    quote: quote.text,
    body: comment.body,
    is_spoiler: comment.isSpoiler,
  });
  if (error !== null) throw commentErrorFrom(error);
  return (data as unknown as { id: string }).id;
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
  // A comment on chosen words or on a paragraph has its own call; a reply goes through
  // post_comment() and takes its comment's paragraph and words in the database.
  if (comment.quote !== undefined && comment.replyTo === null) {
    return postPassageComment(client, address, comment, comment.quote);
  }
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

/**
 * Brings back a comment the caller just deleted: the Undo in "Comment deleted. Undo" (design
 * books item 14; restore_comment() allows only the person who deleted it, within 10 minutes).
 *
 * @param client - the shared Supabase client
 * @param commentId - the comment's row ID
 * Errors: throws a CommentError when the database refuses it or can't be reached.
 */
export async function restoreComment(client: AppSupabaseClient, commentId: string): Promise<void> {
  const { error } = await client.rpc('restore_comment', { comment_id: commentId });
  if (error !== null) throw commentErrorFrom(error);
}
