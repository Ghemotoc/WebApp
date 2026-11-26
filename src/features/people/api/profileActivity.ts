/**
 * Profile activity: the numbers and lines a writer's profile draws beyond get_writer_profile(),
 * and the person's public bookshelves (bundle 3 of "Build: the full design as user stories",
 * boards C04 and C06; Robert, 25 Nov 2026, 09:50 UTC: no widget missing between the canvas and the
 * live site).
 *
 * Who calls it: hooks/useProfileActivity.ts (WriterProfilePage's Following number, "Recent posts
 * in Together" and "Also on"; ProfileBookshelvesPage).
 * What it calls next: profile_activity() and profile_bookshelves()
 * (supabase/migrations/…_books_c04_profile_activity.sql). Both answer null when the profile isn't
 * shown to this reader (unknown, removed, blocked either way, or kept from them), and never the
 * user ID. Posts count and list only what this reader may read.
 */
import { readingListsFromJson, type ReadingList } from '@/features/library/api/readingLists';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One of the person's latest forum posts ("Recent posts in Together"). */
export interface ProfileRecentPost {
  threadTitle: string;
  forumSlug: string;
  /** The forum's name in the reader's language. */
  forumName: string;
  threadNumber: number;
  postNumber: number;
  postedAt: string;
}

/** An open space the person runs ("Also on" › Spaces). */
export interface ProfileSpace {
  name: string;
  slug: string;
}

/** What profile_activity() answers, in the app's shape. */
export interface ProfileActivity {
  /** How many live accounts the person follows. */
  following: number;
  /** How many public bookshelves this reader may see. */
  publicBookshelves: number;
  /** How many of the person's forum posts this reader may read. */
  postCount: number;
  /** The three latest of those posts, newest first. */
  recentPosts: ProfileRecentPost[];
  spaces: ProfileSpace[];
}

/** The database's JSON for one post. */
interface RecentPostRow {
  thread_title: string;
  forum_slug: string;
  forum_name: string | null;
  thread_number: number;
  post_number: number;
  posted_at: string;
}

/** The database's JSON for the whole answer. */
interface ProfileActivityRow {
  following: number;
  public_bookshelves: number;
  post_count: number;
  recent_posts: RecentPostRow[];
  spaces: ProfileSpace[];
}

/**
 * Turns one post row into the app's shape.
 *
 * @param row - the post as the database answered it
 * @returns the post
 */
function toRecentPost(row: RecentPostRow): ProfileRecentPost {
  return {
    threadTitle: row.thread_title,
    forumSlug: row.forum_slug,
    // A forum always has a name in Romanian or English; the slug is only a last resort.
    forumName: row.forum_name ?? row.forum_slug,
    threadNumber: row.thread_number,
    postNumber: row.post_number,
    postedAt: row.posted_at,
  };
}

/**
 * Reads a profile's activity.
 *
 * @param client - the shared Supabase client
 * @param handle - the username from the address
 * @param language - the reader's language code, for forum names ('ro', 'en')
 * @returns the activity, or null when the profile isn't shown to this reader
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchProfileActivity(
  client: AppSupabaseClient,
  handle: string,
  language: string,
): Promise<ProfileActivity | null> {
  const { data, error } = await client.rpc('profile_activity', {
    wanted_handle: handle,
    wanted_language: language,
  });
  if (error !== null) throw new Error(`Could not read the profile's activity: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as ProfileActivityRow;
  return {
    following: row.following,
    publicBookshelves: row.public_bookshelves,
    postCount: row.post_count,
    recentPosts: row.recent_posts.map(toRecentPost),
    spaces: row.spaces,
  };
}

/**
 * Reads a person's public bookshelves, the one changed last first.
 *
 * @param client - the shared Supabase client
 * @param handle - the username from the address
 * @returns the bookshelves, or null when the profile isn't shown to this reader
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchProfileBookshelves(
  client: AppSupabaseClient,
  handle: string,
): Promise<ReadingList[] | null> {
  const { data, error } = await client.rpc('profile_bookshelves', { wanted_handle: handle });
  if (error !== null) throw new Error(`Could not read the bookshelves: ${error.message}`);
  if (data === null) return null;
  return readingListsFromJson(data);
}

/**
 * The address of a post in its thread (the thread page scrolls to ?post=; FORUMS-1b).
 *
 * @param post - the post
 * @returns the path, for example "/forums/first-chapters/12?post=3"
 */
export function recentPostHref(post: ProfileRecentPost): string {
  const thread = `/forums/${encodeURIComponent(post.forumSlug)}/${String(post.threadNumber)}`;
  return `${thread}?post=${String(post.postNumber)}`;
}
