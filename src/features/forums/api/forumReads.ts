/**
 * Read and unread in the forums: marking a thread read up to a post, "Mark as read" on a forum
 * or category, "Mark all as read", and "New for you" (bundle FORUMS-1, part d; story S1-E8-04).
 *
 * Who calls it: hooks/useForumReads.ts. What it calls next: mark_forum_thread_read(),
 * mark_forums_read() and forum_new_for_you() in
 * supabase/migrations/…_forums1_d_read_and_unread.sql. What someone has read stays theirs: the
 * database answers it only to them.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One thread in "New for you". */
export interface ForumNewThread {
  title: string;
  /** The forum's name in the reader's language. */
  forumName: string;
  forumSlug: string;
  number: number;
  /** The first post new to the reader, where the link opens. */
  firstUnreadPost: number;
  /** How many posts are new ("3 new"). */
  newCount: number;
  lastPostAt: string;
}

/**
 * Records that the reader has seen a thread up to a post (it only ever moves forward).
 *
 * @param client - the Supabase client
 * @param threadNumber - the thread
 * @param upToPost - the highest post number on screen
 * @throws Error when the database refuses or can't be reached
 */
export async function markThreadRead(
  client: AppSupabaseClient,
  threadNumber: number,
  upToPost: number,
): Promise<void> {
  const { error } = await client.rpc('mark_forum_thread_read', {
    thread_number: threadNumber,
    up_to_post: upToPost,
  });
  if (error) throw new Error(`Could not mark the thread as read: ${error.message}`);
}

/**
 * "Mark as read" on a forum or category (and every forum inside it), or "Mark all as read".
 *
 * @param client - the Supabase client
 * @param forumSlug - the forum or category, or null for the whole board
 * @throws Error when the database refuses or can't be reached
 */
export async function markForumsRead(
  client: AppSupabaseClient,
  forumSlug: string | null,
): Promise<void> {
  const where = forumSlug === null ? {} : { forum_slug: forumSlug };
  const { error } = await client.rpc('mark_forums_read', where);
  if (error) throw new Error(`Could not mark the forums as read: ${error.message}`);
}

/**
 * Reads one "New for you" entry.
 *
 * @param value - one item of forum_new_for_you()'s answer
 * @returns the thread
 */
function newThreadFrom(value: Json): ForumNewThread {
  const row = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
  return {
    title: String(row['title'] ?? ''),
    forumName: String(row['forum_name'] ?? ''),
    forumSlug: String(row['forum_slug'] ?? ''),
    number: Number(row['number']),
    firstUnreadPost: Number(row['first_unread_post']),
    newCount: Number(row['new_count']),
    lastPostAt: String(row['last_post_at'] ?? ''),
  };
}

/**
 * The threads with new posts for the reader, newest first.
 *
 * @param client - the Supabase client
 * @param languageCode - the reader's language, for the forums' names
 * @returns up to five threads; none for a visitor
 * @throws Error when the database can't be reached
 */
export async function fetchNewForYou(
  client: AppSupabaseClient,
  languageCode: string,
): Promise<ForumNewThread[]> {
  const { data, error } = await client.rpc('forum_new_for_you', { language_code: languageCode });
  if (error) throw new Error(`Could not load the new threads: ${error.message}`);
  return Array.isArray(data) ? data.map(newThreadFrom) : [];
}
