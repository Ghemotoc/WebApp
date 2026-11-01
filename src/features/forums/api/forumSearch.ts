/**
 * Searching the forums' threads and posts (bundle FORUMS-1, part f; story S1-E8-10).
 *
 * Who calls it: hooks/useForumSearch.ts, for ForumSearchPage. What it calls next:
 * search_forum_posts() in supabase/migrations/…_forums1_f_forum_search.sql, which anyone may call.
 * The database does the matching (without diacritics, with Romanian stemming) and leaves out
 * removed posts and blocked people, so this file only sends the search and reads the answer.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { personFrom, type ForumPerson } from './forumThreads';

/** What to search for, and where. */
export interface ForumSearchQuery {
  term: string;
  /** A forum's address (its subforums included), or null for every forum. */
  forumSlug: string | null;
  /** A username, with or without "@", or null for anyone. */
  authorHandle: string | null;
}

/** One thread or post a search found. */
export interface ForumSearchResult {
  /** thread: the thread's title matched; post: a post's words matched. */
  kind: 'thread' | 'post';
  threadNumber: number;
  threadTitle: string;
  forumSlug: string;
  forumName: string;
  postNumber: number;
  author: ForumPerson;
  createdAt: string;
  /** The start of the post's words, as plain text. */
  snippet: string;
}

/** One page of results. */
export interface ForumSearchPage {
  results: ForumSearchResult[];
  hasMore: boolean;
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
 * Reads one result.
 *
 * @param row - one item of search_forum_posts()'s results
 * @returns the result
 */
function resultFrom(row: JsonObject): ForumSearchResult {
  return {
    kind: row['kind'] === 'thread' ? 'thread' : 'post',
    threadNumber: Number(row['thread_number']),
    threadTitle: String(row['thread_title'] ?? ''),
    forumSlug: String(row['forum_slug'] ?? ''),
    forumName: String(row['forum_name'] ?? ''),
    postNumber: Number(row['post_number']),
    author: personFrom(row['author']),
    createdAt: String(row['created_at'] ?? ''),
    snippet: String(row['snippet'] ?? ''),
  };
}

/**
 * Searches the forums.
 *
 * @param client - the Supabase client
 * @param query - the term and the filters
 * @param page - how many results are already shown, and the reader's language for forum names
 * @returns one page of results, thread titles first, then the closest matches
 * @throws Error when the database can't be reached
 */
export async function searchForums(
  client: AppSupabaseClient,
  query: ForumSearchQuery,
  page: { skip: number; languageCode: string },
): Promise<ForumSearchPage> {
  // Step 1: only the filters that are set go to the database; the rest keep their defaults.
  const forum = query.forumSlug === null ? {} : { forum_slug: query.forumSlug };
  const author = query.authorHandle === null ? {} : { author_handle: query.authorHandle };
  const { data, error } = await client.rpc('search_forum_posts', {
    term: query.term,
    ...forum,
    ...author,
    skip: page.skip,
    language_code: page.languageCode,
  });
  if (error) throw new Error(`Could not search the forums: ${error.message}`);
  // Step 2: read the answer.
  const answer = objectOf(data);
  const rows = Array.isArray(answer['results']) ? answer['results'] : [];
  return {
    results: rows.map((row) => resultFrom(objectOf(row))),
    hasMore: answer['has_more'] === true,
  };
}
