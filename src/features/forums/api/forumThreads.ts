/**
 * Forum threads and posts: reading a forum's threads and a thread's posts, and starting,
 * replying, editing and deleting (bundle FORUMS-1, part b; story S1-E8-02; board 5.2). Part c
 * adds each post's quotes (S1-E8-03).
 *
 * Who calls it: hooks/useForumThreads.ts. What it calls next: forum_thread_list(),
 * forum_thread(), start_forum_thread(), reply_to_forum_thread(), edit_forum_post(),
 * delete_forum_post() and forum_post_history() in
 * supabase/migrations/…_forums1_b_threads_and_posts.sql. The database never answers a user ID;
 * this file turns its JSON into the app's shapes, and its refusals into ForumWriteError.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A person as the forums show them; null for a deleted account. */
export type ForumPerson = { handle: string; displayName: string; isStaff: boolean } | null;

/** What a reader sees in a post's place (forum_post_state_for_caller()). */
export type ForumPostState = 'live' | 'hidden' | 'removed' | 'deleted';

/**
 * What a quote shows (forum_quote_json()): the quoted post's words, a marker when its author
 * deleted it or staff removed it, or "unavailable" when this reader can't read it (S1-E8-03).
 */
export type ForumQuoteState = 'live' | 'deleted' | 'removed' | 'unavailable';

/** One quoted post inside a reply, drawn from the quoted post as it is now (S1-E8-03). */
export interface ForumQuote {
  /** The quoted post's number, for the link back to it. */
  number: number;
  /** Null for a deleted account, and when the quote is unavailable. */
  author: ForumPerson;
  state: ForumQuoteState;
  /** The words, only when live. */
  body: string | null;
}

/** One post in a thread. */
export interface ForumPost {
  id: string;
  /** Its place in the thread: #1, #2… (never reused). */
  number: number;
  author: ForumPerson;
  isStarter: boolean;
  isMine: boolean;
  createdAt: string;
  /** When its author last changed it; null when never. */
  editedAt: string | null;
  state: ForumPostState;
  /** The words, only for live and hidden posts. */
  body: string | null;
  /** The posts it quotes, in thread order (S1-E8-03). */
  quotes: ForumQuote[];
  canEdit: boolean;
  canDelete: boolean;
  /** Moderators only: the post has earlier versions to read. */
  hasHistory: boolean;
}

/** A thread's heading and side panel. */
export interface ForumThreadHeader {
  id: string;
  number: number;
  title: string;
  forumSlug: string;
  author: ForumPerson;
  isMine: boolean;
  state: 'live' | 'hidden';
  createdAt: string;
  replyCount: number;
  writerCount: number;
  lastPostAt: string;
  canReply: boolean;
}

/** One read of a thread: the heading, some posts in order, and whether more come after. */
export interface ForumThreadPage {
  thread: ForumThreadHeader;
  posts: ForumPost[];
  hasMore: boolean;
}

/** One thread in a forum's list. */
export interface ForumThreadSummary {
  number: number;
  title: string;
  author: ForumPerson;
  createdAt: string;
  replyCount: number;
  lastPostAt: string;
  lastPoster: ForumPerson;
}

/** One read of a forum's list. */
export interface ForumThreadListPage {
  threads: ForumThreadSummary[];
  hasMore: boolean;
}

/** One earlier version of an edited post (moderators only). */
export interface ForumPostVersion {
  body: string;
  /** The thread's title before an edit of post #1 changed it; null otherwise. */
  title: string | null;
  writtenAt: string;
}

/** A JSON object as the database sends it. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as an object.
 *
 * @param value - any JSON value
 * @returns the object, or an empty one for anything else
 */
function objectOf(value: Json | undefined): JsonObject {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return {};
  return value;
}

/**
 * Reads a JSON value as a list of objects.
 *
 * @param value - any JSON value
 * @returns the objects, or an empty list
 */
function listOf(value: Json | undefined): JsonObject[] {
  return Array.isArray(value) ? value.map(objectOf) : [];
}

/**
 * Reads an optional text field.
 *
 * @param value - a JSON value
 * @returns the text, or null when it is missing or null
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Reads a person.
 *
 * @param value - forum_person_json()'s answer
 * @returns the person, or null for a deleted account
 */
export function personFrom(value: Json | undefined): ForumPerson {
  const person = objectOf(value);
  if (typeof person['handle'] !== 'string') return null;
  return {
    handle: person['handle'],
    displayName: String(person['display_name'] ?? person['handle']),
    isStaff: person['is_staff'] === true,
  };
}

/** The quote states the database sends; anything else reads as unavailable. */
const quoteStates: ForumQuoteState[] = ['live', 'deleted', 'removed', 'unavailable'];

/**
 * Reads one quote.
 *
 * @param row - forum_quote_json()'s answer
 * @returns the quote
 */
export function quoteFrom(row: JsonObject): ForumQuote {
  const state = quoteStates.find((known) => known === row['state']) ?? 'unavailable';
  return {
    number: Number(row['number']),
    author: personFrom(row['author']),
    state,
    body: state === 'live' ? textOrNull(row['body']) : null,
  };
}

/**
 * Reads one post.
 *
 * @param row - forum_post_json()'s answer
 * @returns the post
 */
export function postFrom(row: JsonObject): ForumPost {
  return {
    id: String(row['id']),
    number: Number(row['number']),
    author: personFrom(row['author']),
    isStarter: row['is_starter'] === true,
    isMine: row['is_mine'] === true,
    createdAt: String(row['created_at']),
    editedAt: textOrNull(row['edited_at']),
    state: String(row['state']) as ForumPostState,
    body: textOrNull(row['body']),
    quotes: listOf(row['quotes']).map(quoteFrom),
    canEdit: row['can_edit'] === true,
    canDelete: row['can_delete'] === true,
    hasHistory: row['has_history'] === true,
  };
}

/**
 * Reads a thread's heading.
 *
 * @param row - forum_thread_header_json()'s answer
 * @returns the heading
 */
function headerFrom(row: JsonObject): ForumThreadHeader {
  return {
    id: String(row['id']),
    number: Number(row['number']),
    title: String(row['title']),
    forumSlug: String(row['forum_slug']),
    author: personFrom(row['author']),
    isMine: row['is_mine'] === true,
    state: row['state'] === 'hidden' ? 'hidden' : 'live',
    createdAt: String(row['created_at']),
    replyCount: Number(row['reply_count']),
    writerCount: Number(row['writer_count']),
    lastPostAt: String(row['last_post_at']),
    canReply: row['can_reply'] === true,
  };
}

/**
 * Reads one thread of a forum's list.
 *
 * @param row - forum_thread_summary_json()'s answer
 * @returns the thread
 */
function summaryFrom(row: JsonObject): ForumThreadSummary {
  return {
    number: Number(row['number']),
    title: String(row['title']),
    author: personFrom(row['author']),
    createdAt: String(row['created_at']),
    replyCount: Number(row['reply_count']),
    lastPostAt: String(row['last_post_at']),
    lastPoster: personFrom(row['last_poster']),
  };
}

/**
 * Reads one page of a forum's threads, latest activity first.
 *
 * @param client - the Supabase client
 * @param forumSlug - the forum's address
 * @param olderThan - null for the first page; the last thread's lastPostAt for the next
 * @returns the page, or null when there is no such forum
 * @throws Error when the database can't be reached
 */
export async function fetchThreadList(
  client: AppSupabaseClient,
  forumSlug: string,
  olderThan: string | null,
): Promise<ForumThreadListPage | null> {
  const where = olderThan === null ? {} : { older_than: olderThan };
  const { data, error } = await client.rpc('forum_thread_list', {
    forum_slug: forumSlug,
    ...where,
  });
  if (error) throw new Error(`Could not load the threads: ${error.message}`);
  if (data === null) return null;
  const page = objectOf(data);
  return { threads: listOf(page['threads']).map(summaryFrom), hasMore: page['has_more'] === true };
}

/** Which posts of a thread to read. */
export interface ThreadReadRange {
  /** 0 for the first posts; the last shown post's number for the next ones. */
  afterPost: number;
  /** A permalink's post number: the read reaches at least that far. */
  upToPost: number | null;
}

/**
 * Reads a thread with some of its posts.
 *
 * @param client - the Supabase client
 * @param threadNumber - the number in the thread's address
 * @param range - which posts
 * @returns the page, or null when the reader may not open the thread
 * @throws Error when the database can't be reached
 */
export async function fetchThread(
  client: AppSupabaseClient,
  threadNumber: number,
  range: ThreadReadRange,
): Promise<ForumThreadPage | null> {
  const upTo = range.upToPost === null ? {} : { up_to_post: range.upToPost };
  const { data, error } = await client.rpc('forum_thread', {
    thread_number: threadNumber,
    after_post: range.afterPost,
    ...upTo,
  });
  if (error) throw new Error(`Could not load the thread: ${error.message}`);
  if (data === null) return null;
  const page = objectOf(data);
  return {
    thread: headerFrom(objectOf(page['thread'])),
    posts: listOf(page['posts']).map(postFrom),
    hasMore: page['has_more'] === true,
  };
}
