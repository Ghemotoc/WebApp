/**
 * Writing in the forums: starting a thread, replying, editing and deleting one's own post, and
 * the earlier versions moderators read (bundle FORUMS-1, part b; story S1-E8-02).
 *
 * Who calls it: hooks/useForumWrites.ts. What it calls next: start_forum_thread(),
 * reply_to_forum_thread(), edit_forum_post(), delete_forum_post() and forum_post_history() in
 * supabase/migrations/…_forums1_b_threads_and_posts.sql. A refusal becomes a ForumWriteError the
 * screen can say in plain words.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ForumPostVersion } from './forumThreads';

/** Why the database refused a write. */
export type ForumWriteFailure =
  | 'signed_out'
  | 'not_active'
  | 'not_mine'
  | 'too_many'
  | 'gone'
  | 'category'
  | 'locked'
  | 'quote_missing'
  | 'quote_too_many'
  | 'space_join'
  | 'space_pending'
  | 'space_age'
  | 'invalid'
  | 'unreachable';

/** A field the database found a problem with, and which ("title:empty", "body:html"…). */
export interface ForumFieldProblem {
  field: 'title' | 'body';
  problem: 'empty' | 'too_long' | 'html' | 'link';
}

/** The error a refused write throws. */
export class ForumWriteError extends Error {
  /**
   * @param failure - why it was refused
   * @param details - the field's problem for 'invalid'; the minutes to wait for 'too_many'
   */
  constructor(
    readonly failure: ForumWriteFailure,
    readonly details: { field?: ForumFieldProblem; waitMinutes?: number | null } = {},
  ) {
    super(`The forum refused it: ${failure}`);
    this.name = 'ForumWriteError';
  }
}

/** The field hints the database raises (check_forum_post_text(), check_forum_thread_title()). */
const fieldHints: Record<string, ForumFieldProblem> = {
  'title:empty': { field: 'title', problem: 'empty' },
  'title:too_long': { field: 'title', problem: 'too_long' },
  'title:html': { field: 'title', problem: 'html' },
  'body:empty': { field: 'body', problem: 'empty' },
  'body:too_long': { field: 'body', problem: 'too_long' },
  'body:html': { field: 'body', problem: 'html' },
  'body:link': { field: 'body', problem: 'link' },
};

/**
 * Turns a refusal with Postgres's check_violation code (23514) into an error.
 *
 * @param hint - the error's hint
 * @returns 'category' for a thread in a category, 'locked' for a locked thread, quote_missing or quote_too_many for the quotes,
 *   'invalid' with the field's problem otherwise
 */
function checkFailureFrom(hint: string): ForumWriteError {
  if (hint === 'forum:category') return new ForumWriteError('category');
  // A moderator locked the thread while the reply was being written (S1-E8-05).
  if (hint === 'thread:locked') return new ForumWriteError('locked');
  // A quoted post went while the reply was being written, or too many were picked (S1-E8-03).
  if (hint === 'quote:missing') return new ForumWriteError('quote_missing');
  if (hint === 'quote:too_many') return new ForumWriteError('quote_too_many');
  const field = fieldHints[hint];
  if (field === undefined) return new ForumWriteError('unreachable');
  return new ForumWriteError('invalid', { field });
}

/** The space refusals (FORUMS-2a, S1-E8-06): refuse_space_writer()'s hints. */
const spaceHints: Record<string, ForumWriteFailure> = {
  'space:join': 'space_join',
  'space:pending': 'space_pending',
  'space:age': 'space_age',
};

/**
 * Turns a refusal with Postgres's insufficient_privilege code (42501) into an error.
 *
 * @param hint - the error's hint
 * @returns signed_out or not_mine as named, a space refusal for a thread in a space, otherwise
 *   not_active
 */
function privilegeFailureFrom(hint: string): ForumWriteError {
  if (hint === 'signed_out' || hint === 'not_mine') return new ForumWriteError(hint);
  // A space takes posts only from its members or its age group (S1-E8-06).
  const spaceFailure = spaceHints[hint];
  if (spaceFailure !== undefined) return new ForumWriteError(spaceFailure);
  return new ForumWriteError('not_active');
}

/**
 * Turns a database error into a ForumWriteError.
 *
 * @param error - Postgres's code and hint
 * @returns signed_out, not_active, not_mine or a space refusal (42501, by hint), too_many with the minutes (54000,
 *   hint "wait_minutes:n"), gone (P0002), category or invalid (23514), otherwise unreachable
 */
export function forumWriteErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): ForumWriteError {
  const hint = error.hint ?? '';
  if (error.code === '42501') return privilegeFailureFrom(hint);
  if (error.code === '54000') {
    const minutes = Number(hint.replace('wait_minutes:', ''));
    return new ForumWriteError('too_many', {
      waitMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    });
  }
  if (error.code === 'P0002') return new ForumWriteError('gone');
  if (error.code === '23514') return checkFailureFrom(hint);
  return new ForumWriteError('unreachable');
}

/**
 * Reads one field of a JSON answer as a number.
 *
 * @param data - the function's answer
 * @param key - the field
 * @returns the number
 */
function numberIn(data: unknown, key: string): number {
  const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return Number(record[key]);
}

/** A new thread: where it goes and what it says. */
export interface NewThread {
  forumSlug: string;
  title: string;
  body: string;
}

/**
 * Starts a thread with its first post.
 *
 * @param client - the Supabase client
 * @param thread - the forum, title and words
 * @returns the new thread's number, for its address
 * @throws ForumWriteError when refused
 */
export async function startThread(client: AppSupabaseClient, thread: NewThread): Promise<number> {
  const { data, error } = await client.rpc('start_forum_thread', {
    forum_slug: thread.forumSlug,
    title: thread.title,
    body: thread.body,
  });
  if (error) throw forumWriteErrorFrom(error);
  return numberIn(data, 'thread_number');
}

/** A reply: its words and the posts it quotes (S1-E8-03). */
export interface NewReply {
  body: string;
  /** The IDs of the quoted posts; the database puts them in thread order. */
  quotedPostIds: string[];
  /** False for "Don't bump": the thread keeps its place in the forum's list (S1-E8-05). */
  bump: boolean;
}

/**
 * Adds a reply at the end of a thread, with any quotes, moving the thread up its forum unless
 * the writer ticked "Don't bump".
 *
 * @param client - the Supabase client
 * @param threadNumber - the thread
 * @param reply - the words, the quoted posts and whether to bump
 * @returns the new post's number, for its permalink
 * @throws ForumWriteError when refused
 */
export async function replyToThread(
  client: AppSupabaseClient,
  threadNumber: number,
  reply: NewReply,
): Promise<number> {
  const { data, error } = await client.rpc('reply_to_forum_thread', {
    thread_number: threadNumber,
    body: reply.body,
    quoted_posts: reply.quotedPostIds,
    bump: reply.bump,
  });
  if (error) throw forumWriteErrorFrom(error);
  return numberIn(data, 'post_number');
}

/** A change to one's own post; title only for post #1. */
export interface PostChange {
  postId: string;
  body: string;
  title: string | null;
}

/**
 * Changes one's own post (and, on #1, the thread's title).
 *
 * @param client - the Supabase client
 * @param change - the post and its new words
 * @throws ForumWriteError when refused
 */
export async function editPost(client: AppSupabaseClient, change: PostChange): Promise<void> {
  const title = change.title === null ? {} : { title: change.title };
  const { error } = await client.rpc('edit_forum_post', {
    post_id: change.postId,
    body: change.body,
    ...title,
  });
  if (error) throw forumWriteErrorFrom(error);
}

/**
 * Deletes one's own post.
 *
 * @param client - the Supabase client
 * @param postId - the post
 * @returns true when the whole thread went with it (#1 of a thread nobody answered)
 * @throws ForumWriteError when refused
 */
export async function deletePost(client: AppSupabaseClient, postId: string): Promise<boolean> {
  const { data, error } = await client.rpc('delete_forum_post', { post_id: postId });
  if (error) throw forumWriteErrorFrom(error);
  const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return record['thread_deleted'] === true;
}

/**
 * Reads a post's earlier versions (moderators only).
 *
 * @param client - the Supabase client
 * @param postId - the post
 * @returns the versions, oldest first
 * @throws Error when refused or unreachable
 */
export async function fetchPostHistory(
  client: AppSupabaseClient,
  postId: string,
): Promise<ForumPostVersion[]> {
  const { data, error } = await client.rpc('forum_post_history', { post_id: postId });
  if (error) throw new Error(`Could not load the earlier versions: ${error.message}`);
  const versions = Array.isArray(data) ? data : [];
  return versions.map((entry) => {
    const version = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<
      string,
      unknown
    >;
    return {
      body: String(version['body'] ?? ''),
      title: typeof version['title'] === 'string' ? version['title'] : null,
      writtenAt: String(version['written_at'] ?? ''),
    };
  });
}
