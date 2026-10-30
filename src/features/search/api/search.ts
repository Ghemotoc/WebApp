/**
 * Search: the writers and tags a search finds (story S1-E5-04). Stories are an ordinary story
 * list (browse_stories() with the list 'search'), so they come through
 * src/features/discovery/api/storyLists.ts.
 *
 * Who calls it: hooks/useSearchResults.ts.
 * What it calls next: search_writers() and search_tags() (…_s1_e5_04_search.sql). Both leave out
 * what this reader may not see: writers with no story the reader may see (so readers' own
 * accounts are never listed), both sides of a block, and anything a moderator hid. Neither
 * answers a user ID.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** A writer a search found. */
export interface FoundWriter {
  handle: string;
  displayName: string;
  bio: string;
  /** How many of their stories the reader may see. */
  storyCount: number;
}

/** A tag a search found. */
export interface FoundTag {
  /** The stored name; screens show it in the interface language (useTagCatalogue). */
  name: string;
  storyCount: number;
}

/** One page of a group, with how many the group holds. */
export interface FoundPage<Item> {
  total: number;
  items: Item[];
}

/** Which page to read. */
export interface PageWindow {
  pageSize: number;
  offset: number;
}

/**
 * Reads a JSON answer's list as plain objects.
 *
 * @param value - the list as the database sent it
 * @returns the entries that are objects
 */
function entriesOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
  );
}

/**
 * Reads a JSON value as text, empty when it isn't text.
 *
 * @param value - the value
 * @returns the text
 */
function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * The writers whose username or pen name answers a search.
 *
 * @param client - the shared Supabase client
 * @param term - what the reader typed
 * @param window - the page
 * @returns the page and the total
 * Errors: throws when the database can't be reached.
 */
export async function fetchFoundWriters(
  client: AppSupabaseClient,
  term: string,
  window: PageWindow,
): Promise<FoundPage<FoundWriter>> {
  const { data, error } = await client.rpc('search_writers', {
    term,
    page_size: window.pageSize,
    page_offset: window.offset,
  });
  if (error !== null) throw new Error(`Could not search the writers: ${error.message}`);
  const answer = (data ?? {}) as { total?: unknown; writers?: unknown };
  return {
    total: typeof answer.total === 'number' ? answer.total : 0,
    items: entriesOf(answer.writers).map((writer) => ({
      handle: textOf(writer.handle),
      displayName: textOf(writer.display_name),
      bio: textOf(writer.bio),
      storyCount: typeof writer.story_count === 'number' ? writer.story_count : 0,
    })),
  };
}

/**
 * The approved tags whose name, in any language, answers a search.
 *
 * @param client - the shared Supabase client
 * @param term - what the reader typed
 * @param window - the page
 * @returns the page and the total
 * Errors: throws when the database can't be reached.
 */
export async function fetchFoundTags(
  client: AppSupabaseClient,
  term: string,
  window: PageWindow,
): Promise<FoundPage<FoundTag>> {
  const { data, error } = await client.rpc('search_tags', {
    term,
    page_size: window.pageSize,
    page_offset: window.offset,
  });
  if (error !== null) throw new Error(`Could not search the tags: ${error.message}`);
  const answer = (data ?? {}) as { total?: unknown; tags?: unknown };
  return {
    total: typeof answer.total === 'number' ? answer.total : 0,
    items: entriesOf(answer.tags).map((tag) => ({
      name: textOf(tag.name),
      storyCount: typeof tag.story_count === 'number' ? tag.story_count : 0,
    })),
  };
}
