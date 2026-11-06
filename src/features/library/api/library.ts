/**
 * The reader's library and their place in every chapter (story S1-E4-03; board 3.7 Library).
 *
 * Who calls it: the hooks in ../hooks/ (Library page, story page, reader).
 * What it calls next: the functions in supabase/migrations/…_s1_e4_03_library.sql. Each reads or
 * writes the caller's own rows only (row-level security and the functions' own checks); this
 * file turns the database's JSON into the app's shapes. The shelves' stories themselves come
 * from browse_stories('library', <shelf>) through the discovery feature's list code.
 * Since IDEAS-1c it also says whether the reader thanked the writer, and sends that thank-you
 * (…_ideas1_c_readers_to_writers.sql).
 */
import {
  toListedStory,
  type ListedStory,
  type ListedStoryRow,
} from '@/features/discovery/api/storyLists';
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The three shelves, generated from the database's enum. */
export type LibraryShelf = Database['public']['Enums']['library_shelf'];

/** The shelves in the order the Library shows them. */
export const libraryShelves: readonly LibraryShelf[] = ['reading', 'saved', 'finished'];

/** The kind of screen a place was saved on ("on your phone"). */
export type DeviceKind = 'phone' | 'tablet' | 'computer';

/** Where the reader last was in a story. */
export interface StoryPlace {
  chapterCode: string;
  /** The chapter's number among the readable chapters, and how many there are. */
  number: number;
  total: number;
  /** How far through that chapter, 0 to 100. */
  percent: number;
  deviceKind: DeviceKind;
  savedAt: string;
  /** The chapter after it, or null at the last one. */
  nextCode: string | null;
}

/** A story to continue, with the place. */
export interface ContinueReadingItem {
  story: ListedStory;
  place: StoryPlace;
}

/** The Library page's first answer. */
export interface LibraryOverview {
  counts: Record<LibraryShelf, number>;
  continueReading: ContinueReadingItem[];
  /** "Chapter n of N" for each story with a place, by the story's address. */
  places: Record<string, { number: number; total: number }>;
}

/** A writer the reader follows. */
export interface FollowedWriter {
  handle: string;
  displayName: string;
  lastPublishedAt: string | null;
}

/** What the reader follows. */
export interface MyFollows {
  writers: FollowedWriter[];
  stories: ListedStory[];
}

/** A story's shelf and the reader's latest place in it. */
export interface StoryLibraryState {
  shelf: LibraryShelf | null;
  place: StoryPlace | null;
  /** Whether the reader already told the writer they finished it (IDEAS-1c). */
  thanksSent: boolean;
}

/** The database's JSON for a place (also read by Discover's Continue reading card, LOOK-4b). */
export interface PlaceRow {
  chapter_code: string;
  number: number;
  total: number;
  percent: number;
  device_kind: DeviceKind;
  saved_at: string;
  next_code: string | null;
}

/**
 * The app's shape of a place.
 *
 * @param row - from latest_place_json()
 * @returns the place
 */
export function toPlace(row: PlaceRow): StoryPlace {
  return {
    chapterCode: row.chapter_code,
    number: row.number,
    total: row.total,
    percent: row.percent,
    deviceKind: row.device_kind,
    savedAt: row.saved_at,
    nextCode: row.next_code,
  };
}

/**
 * Reads the Library page's counts, the stories to continue and the places.
 *
 * @param client - the shared Supabase client
 * @returns the overview
 * Errors: throws with the database's message when it can't be read (or the caller is signed out).
 */
export async function fetchLibraryOverview(client: AppSupabaseClient): Promise<LibraryOverview> {
  const { data, error } = await client.rpc('my_library');
  if (error !== null) throw new Error(`Could not read your library: ${error.message}`);
  const answer = data as unknown as {
    counts: Record<LibraryShelf, number>;
    continue_reading: { story: ListedStoryRow; place: PlaceRow }[];
    places: Record<string, { number: number; total: number }>;
  };
  return {
    counts: answer.counts,
    continueReading: answer.continue_reading.map((item) => ({
      story: toListedStory(item.story),
      place: toPlace(item.place),
    })),
    places: answer.places,
  };
}

/**
 * Reads the writers and stories the reader follows.
 *
 * @param client - the shared Supabase client
 * @returns both lists
 * Errors: throws with the database's message when they can't be read.
 */
export async function fetchMyFollows(client: AppSupabaseClient): Promise<MyFollows> {
  const { data, error } = await client.rpc('my_follows');
  if (error !== null) throw new Error(`Could not read who you follow: ${error.message}`);
  const answer = data as unknown as {
    writers: { handle: string; display_name: string; last_published_at: string | null }[];
    stories: ListedStoryRow[];
  };
  return {
    writers: answer.writers.map((writer) => ({
      handle: writer.handle,
      displayName: writer.display_name,
      lastPublishedAt: writer.last_published_at,
    })),
    stories: answer.stories.map(toListedStory),
  };
}

/**
 * Reads a story's shelf and the reader's latest place in it.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the state, or null when the reader may not see the story
 * Errors: throws with the database's message when it can't be read.
 */
export async function fetchStoryLibraryState(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<StoryLibraryState | null> {
  const { data, error } = await client.rpc('story_library_state', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the story's place: ${error.message}`);
  if (data === null) return null;
  const answer = data as unknown as {
    shelf: LibraryShelf | null;
    place: PlaceRow | null;
    thanks_sent?: boolean;
  };
  return {
    shelf: answer.shelf,
    place: answer.place === null ? null : toPlace(answer.place),
    thanksSent: answer.thanks_sent === true,
  };
}

/** What send_finished_thanks() can answer (IDEAS-1c). */
export type FinishedThanksOutcome =
  'ok' | 'already_sent' | 'not_finished' | 'own_story' | 'not_active' | 'not_found';

/**
 * Tells a story's writer, in fixed kind words, that the reader finished it (idea
 * IDEA-20261031-3). Once per story; nothing crosses a block.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the outcome: 'ok', 'already_sent', or why it can't be sent
 * Errors: throws with the database's message (signed out, or the database can't be reached).
 */
export async function sendFinishedThanks(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<FinishedThanksOutcome> {
  const { data, error } = await client.rpc('send_finished_thanks', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not tell the writer: ${error.message}`);
  const outcome = (data as { outcome?: FinishedThanksOutcome } | null)?.outcome;
  return outcome ?? 'not_found';
}

/**
 * Puts a story on a shelf, or takes it off.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param shelf - the shelf, or null to take it off
 * @returns the shelf now
 * Errors: throws with the database's message (signed out, or a story the reader can't see).
 */
export async function setLibraryShelf(
  client: AppSupabaseClient,
  storySlug: string,
  shelf: LibraryShelf | null,
): Promise<LibraryShelf | null> {
  const { data, error } = await client.rpc('set_library_shelf', {
    story_slug: storySlug,
    // The generated type says the enum, but the function takes null to remove the story.
    wanted_shelf: shelf as LibraryShelf,
  });
  if (error !== null) throw new Error(`Could not change your library: ${error.message}`);
  return (data as unknown as { shelf: LibraryShelf | null }).shelf;
}

/**
 * Reads how far the reader got in one chapter.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns the percent and when it was saved, or null when there is no place
 * Errors: throws with the database's message when it can't be read.
 */
export async function fetchPlaceInChapter(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<{ percent: number; savedAt: string } | null> {
  const { data, error } = await client.rpc('my_place_in_chapter', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not read your place: ${error.message}`);
  if (data === null) return null;
  const answer = data as unknown as { percent: number; saved_at: string };
  return { percent: answer.percent, savedAt: answer.saved_at };
}

/** A place to save: the chapter, how far through it and the kind of screen. */
export interface PlaceToSave {
  storySlug: string;
  chapterCode: string;
  /** 0 to 100. */
  percent: number;
  deviceKind: DeviceKind;
}

/**
 * Saves how far the reader got in a chapter.
 *
 * @param client - the shared Supabase client
 * @param place - the chapter, the percent and the kind of screen
 * Errors: throws with the database's message when it can't be saved.
 */
export async function saveReadingPosition(
  client: AppSupabaseClient,
  place: PlaceToSave,
): Promise<void> {
  const { error } = await client.rpc('save_reading_position', {
    story_slug: place.storySlug,
    chapter_code: place.chapterCode,
    read_percent: Math.round(place.percent),
    device_kind: place.deviceKind,
  });
  if (error !== null) throw new Error(`Could not save your place: ${error.message}`);
}
