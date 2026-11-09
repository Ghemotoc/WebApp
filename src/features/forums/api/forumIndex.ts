/**
 * The forum index: every live category, forum and subforum in the reader's language, with its
 * numbers and latest post (bundle FORUMS-1, part a; story S1-E8-01; board 5.1 Forums).
 *
 * Who calls it: hooks/useForumIndex.ts. What it calls next: forum_index() in
 * supabase/migrations/…_forums1_a_forum_categories.sql, which anyone may call, signed out
 * included. This file turns the database's rows into the app's shape; lib/forumTree.ts puts them
 * in order.
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A category's colour, generated from the database's enum. */
export type ForumAccent = Database['public']['Enums']['forum_accent'];

/** One row of forum_index(), as the database sends it. */
type ForumIndexRow = Database['public']['Functions']['forum_index']['Returns'][number];

/** The latest post in a forum, as the index shows it ("How do you start… · poppyverse · 12 min ago"). */
export interface ForumLatestPost {
  threadTitle: string;
  threadAddress: string;
  writerHandle: string;
  writerName: string;
  isStaff: boolean;
  postedAt: string;
}

/** One category, forum or subforum. */
export interface ForumEntry {
  id: string;
  /** The category or forum it sits in; null for a category. */
  parentId: string | null;
  /** 0 a category, 1 a forum, 2 a subforum. */
  level: number;
  slug: string;
  position: number;
  isPinned: boolean;
  accent: ForumAccent;
  name: string;
  description: string;
  threadCount: number;
  postCount: number;
  /** When its latest post was written; null while it has none. */
  latestActivityAt: string | null;
  latestPost: ForumLatestPost | null;
  /**
   * Whether it, or a forum inside it, has posts new to the reader (S1-E8-04); null for a
   * visitor, who sees no dots.
   */
  hasUnread: boolean | null;
}

/**
 * Reads one latest post from the database's JSON, or null when there is none.
 *
 * @param value - the latest_post column
 * @returns the post, or null
 */
function toLatestPost(value: ForumIndexRow['latest_post']): ForumLatestPost | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  // The keys are fixed by forum_index(); a missing one reads as an empty value.
  const text = (key: string) => String(value[key] ?? '');
  return {
    threadTitle: text('thread_title'),
    threadAddress: text('thread_address'),
    writerHandle: text('writer_handle'),
    writerName: text('writer_name'),
    isStaff: value['is_staff'] === true,
    postedAt: text('posted_at'),
  };
}

/**
 * Turns one database row into a forum entry.
 *
 * @param row - a forum_index() row
 * @returns the entry
 */
function toForumEntry(row: ForumIndexRow): ForumEntry {
  return {
    id: row.id,
    // The generated type says string, but a category's parent is null.
    parentId: (row.parent_id as string | null) ?? null,
    level: row.level,
    slug: row.slug,
    position: row.position,
    isPinned: row.is_pinned,
    accent: row.accent,
    name: row.name,
    description: row.description,
    threadCount: Number(row.thread_count),
    postCount: Number(row.post_count),
    latestActivityAt: (row.latest_activity_at as string | null) ?? null,
    latestPost: toLatestPost(row.latest_post),
    // The generated type says boolean, but a visitor gets null.
    hasUnread: (row.has_unread as boolean | null) ?? null,
  };
}

/**
 * Reads the forum index in one language.
 *
 * @param client - the Supabase client
 * @param languageCode - the interface language, "ro" or "en"
 * @returns every live category, forum and subforum, in no particular order
 * @throws Error when the database can't be reached
 */
export async function fetchForumIndex(
  client: AppSupabaseClient,
  languageCode: string,
): Promise<ForumEntry[]> {
  const { data, error } = await client.rpc('forum_index', { language_code: languageCode });
  if (error) throw new Error(`Could not load the forums: ${error.message}`);
  return data.map(toForumEntry);
}
