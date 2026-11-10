/**
 * Reading lists: the lists of stories a reader makes and names in their Library (bundle GAPS-6;
 * board Library, "Your lists").
 *
 * Who calls it: hooks/useReadingLists.ts (the Library's card, the list's own page and "Add to a
 * list" on the story page).
 * What it calls next: the functions in supabase/migrations/…_gaps6_reading_lists.sql. Each reads
 * or changes the caller's own lists only; a public list opens for others through reading_list().
 * This file turns the database's JSON into the app's shapes. A list's stories themselves come
 * from browse_stories('reading_list', <id>) through the discovery feature's list code.
 */
import {
  toListedStory,
  type ListedStory,
  type ListedStoryRow,
} from '@/features/discovery/api/storyLists';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The longest name a list can have (the same limit as clean_reading_list_name()). */
export const readingListNameMax = 60;

/** One reading list as the Library's row and the list's page show it. */
export interface ReadingList {
  id: string;
  name: string;
  isPublic: boolean;
  /** True when the list is the reader's own. */
  isOwn: boolean;
  /** Whose list it is: the username, and the pen name when they have one. */
  ownerHandle: string;
  ownerName: string;
  /** How many of its stories this reader may see. */
  storyCount: number;
  /** The three stories added last, for the row's stacked covers. */
  covers: ListedStory[];
}

/** A story in the reader's own list, for its "Remove" row. */
export interface ReadingListEntry {
  slug: string;
  title: string;
}

/** One list on its own page: the list, plus its entries when it is the reader's own. */
export interface ReadingListDetails extends ReadingList {
  entries: ReadingListEntry[];
}

/** One of the reader's lists, saying whether a story is in it ("Add to a list"). */
export interface StoryListChoice {
  id: string;
  name: string;
  isPublic: boolean;
  hasStory: boolean;
}

/** The database's JSON for a list (reading_list_json()). */
interface ReadingListRow {
  id: string;
  name: string;
  is_public: boolean;
  is_own: boolean | null;
  owner: { handle: string; pen_name: string | null } | null;
  story_count: number;
  covers: ListedStoryRow[];
  entries?: ReadingListEntry[];
}

/**
 * A change the database refused, with the hint it raised ('name_taken', 'too_many_lists' …), so
 * a form can say why in plain words.
 */
export class ReadingListChangeError extends Error {
  /** The hint the database function raised, or null when it gave none. */
  readonly hint: string | null;

  constructor(message: string, hint: string | null | undefined) {
    super(message);
    this.name = 'ReadingListChangeError';
    this.hint = hint === undefined || hint === '' ? null : hint;
  }
}

/** The refusals the screens have words for, and each one's locale key under lists.errors. */
const refusalKeys = {
  name_length: 'nameLength',
  name_html: 'nameHtml',
  name_taken: 'nameTaken',
  too_many_lists: 'tooManyLists',
  too_many_stories: 'tooManyStories',
  not_active: 'notActive',
} as const;

/**
 * The locale key of the message for a change that didn't go through.
 *
 * @param error - whatever a change threw
 * @returns the key for the database's reason when it gave one, or the general "didn't save"
 */
export function readingListFailureKey(error: unknown) {
  const hint = error instanceof ReadingListChangeError ? error.hint : null;
  const known = Object.keys(refusalKeys).find((key) => key === hint) as
    keyof typeof refusalKeys | undefined;
  return `lists.errors.${known === undefined ? 'saveFailed' : refusalKeys[known]}` as const;
}

/**
 * The app's shape of a list.
 *
 * @param row - from reading_list_json()
 * @returns the list
 */
function toReadingList(row: ReadingListRow): ReadingList {
  const handle = row.owner?.handle ?? '';
  return {
    id: row.id,
    name: row.name,
    isPublic: row.is_public,
    isOwn: row.is_own === true,
    ownerHandle: handle,
    ownerName: row.owner?.pen_name ?? `@${handle}`,
    storyCount: row.story_count,
    covers: row.covers.map(toListedStory),
  };
}

/** What Supabase answers for a function call. */
interface RpcAnswer {
  data: unknown;
  error: { message: string; hint?: string | null } | null;
}

/**
 * The data of a change, or an error carrying the database's hint.
 *
 * @param answer - what Supabase returned
 * @param action - the words for the error message ("make the list")
 * @returns the answer's object
 * Errors: throws ReadingListChangeError when the database refused, and a plain Error when the
 *   list isn't the caller's (outcome 'not_found').
 */
function checkedChange(answer: RpcAnswer, action: string): Record<string, unknown> {
  if (answer.error !== null) {
    throw new ReadingListChangeError(
      `Could not ${action}: ${answer.error.message}`,
      answer.error.hint,
    );
  }
  const data = (answer.data ?? {}) as Record<string, unknown>;
  if (data.outcome === 'not_found') throw new Error(`Could not ${action}: there is no such list.`);
  return data;
}

/**
 * Reads the reader's own lists, the one changed last first.
 *
 * @param client - the shared Supabase client
 * @returns the lists
 * Errors: throws with the database's message when they can't be read (or the caller is signed out).
 */
export async function fetchMyReadingLists(client: AppSupabaseClient): Promise<ReadingList[]> {
  const { data, error } = await client.rpc('my_reading_lists');
  if (error !== null) throw new Error(`Could not read your reading lists: ${error.message}`);
  return (data as unknown as ReadingListRow[]).map(toReadingList);
}

/**
 * Reads one list for its page.
 *
 * @param client - the shared Supabase client
 * @param listId - the list's ID, from the address
 * @returns the list, or null when there is none or this reader may not see it
 * Errors: throws with the database's message when it can't be read.
 */
export async function fetchReadingList(
  client: AppSupabaseClient,
  listId: string,
): Promise<ReadingListDetails | null> {
  const { data, error } = await client.rpc('reading_list', { list_id: listId });
  if (error !== null) throw new Error(`Could not read the reading list: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as ReadingListRow;
  return { ...toReadingList(row), entries: row.entries ?? [] };
}

/**
 * Reads the reader's lists with whether one story is in each.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the lists, by name
 * Errors: throws with the database's message when they can't be read.
 */
export async function fetchStoryListChoices(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<StoryListChoice[]> {
  const { data, error } = await client.rpc('story_reading_lists', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read your reading lists: ${error.message}`);
  const rows = data as unknown as {
    id: string;
    name: string;
    is_public: boolean;
    has_story: boolean;
  }[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isPublic: row.is_public,
    hasStory: row.has_story,
  }));
}

/**
 * Makes a private, empty list.
 *
 * @param client - the shared Supabase client
 * @param name - the list's name, 1 to 60 characters
 * @returns the new list's ID
 * Errors: throws ReadingListChangeError (name_length, name_html, name_taken, too_many_lists).
 */
export async function createReadingList(client: AppSupabaseClient, name: string): Promise<string> {
  const answer = await client.rpc('create_reading_list', { list_name: name });
  return String(checkedChange(answer, 'make the list').id);
}

/** What can change on a list: its name, who sees it, or both. */
export interface ReadingListChange {
  name?: string;
  isPublic?: boolean;
}

/**
 * Renames a list or changes who sees it.
 *
 * @param client - the shared Supabase client
 * @param listId - the list
 * @param change - the new name and/or whether it is public
 * Errors: throws ReadingListChangeError (name_length, name_html, name_taken, not_active).
 */
export async function updateReadingList(
  client: AppSupabaseClient,
  listId: string,
  change: ReadingListChange,
): Promise<void> {
  const answer = await client.rpc('update_reading_list', {
    list_id: listId,
    new_name: change.name,
    make_public: change.isPublic,
  });
  checkedChange(answer, 'change the list');
}

/**
 * Deletes a list. The stories and the Library's shelves stay as they are.
 *
 * @param client - the shared Supabase client
 * @param listId - the list
 * Errors: throws when the list isn't the caller's or the database can't be reached.
 */
export async function deleteReadingList(client: AppSupabaseClient, listId: string): Promise<void> {
  const answer = await client.rpc('delete_reading_list', { list_id: listId });
  checkedChange(answer, 'delete the list');
}

/** A story to put in a list or take out of it. */
export interface StoryInListChange {
  listId: string;
  storySlug: string;
  isIn: boolean;
}

/**
 * Puts a story in one of the reader's lists, or takes it out.
 *
 * @param client - the shared Supabase client
 * @param change - the list, the story's address and whether it should be in
 * Errors: throws ReadingListChangeError (too_many_stories), or a plain Error for a story the
 *   reader can't see.
 */
export async function setStoryInReadingList(
  client: AppSupabaseClient,
  change: StoryInListChange,
): Promise<void> {
  const answer = await client.rpc('set_story_in_reading_list', {
    list_id: change.listId,
    story_slug: change.storySlug,
    is_in: change.isIn,
  });
  checkedChange(answer, 'change the list');
}
