/**
 * Reads Discover's "pick up where you left off" cards for the signed-in member (story S1-E5-12,
 * bundle LOOK-4b; board Discover, "Your dashboard").
 *
 * Who calls it: hooks/useDiscoverCards.ts.
 * What it calls next: my_discover_cards() in …_look4b_01_discover_cards.sql. It reads only the
 * caller's own rows (no reading history leaves their account) and leaves out any story they may
 * no longer read (ratings, blocks, moderation).
 */
import { toPlace, type PlaceRow, type StoryPlace } from '@/features/library/api/library';
import type { AppSupabaseClient } from '@/lib/supabase';

import { toListedStory, type ListedStory, type ListedStoryRow } from './storyLists';

/** The unfinished story read most recently. */
export interface ContinueReadingCardData {
  story: ListedStory;
  place: StoryPlace;
  /** The number of a chapter that came out after the reader last read, or null. */
  newChapterNumber: number | null;
}

/** The draft chapter saved most recently. */
export interface DraftCardData {
  storySlug: string;
  storyTitle: string;
  chapterCode: string;
  /** The draft's title, or an empty text when the writer hasn't given one yet. */
  title: string;
  /** The chapter's number in its story. */
  number: number;
  wordCount: number;
  savedAt: string;
}

/** Everything the three cards need. */
export interface DiscoverCardsData {
  continueReading: ContinueReadingCardData | null;
  draft: DraftCardData | null;
  /** Whether the member may write, for the gold "Start a new story" card. */
  mayWrite: boolean;
}

/** The function's JSON. */
interface DiscoverCardsRow {
  continue_reading: {
    story: ListedStoryRow;
    place: PlaceRow;
    new_chapter_number: number | null;
  } | null;
  draft: {
    story_slug: string;
    story_title: string;
    chapter_code: string;
    title: string | null;
    number: number;
    word_count: number;
    saved_at: string;
  } | null;
  may_write: boolean;
}

/**
 * Turns the draft's JSON into the screen's shape.
 *
 * @param row - the draft part of my_discover_cards()
 * @returns the draft card's data, or null
 */
function toDraft(row: DiscoverCardsRow['draft']): DraftCardData | null {
  if (row === null) return null;
  return {
    storySlug: row.story_slug,
    storyTitle: row.story_title,
    chapterCode: row.chapter_code,
    title: row.title ?? '',
    number: row.number,
    wordCount: row.word_count,
    savedAt: row.saved_at,
  };
}

/**
 * Reads the cards.
 *
 * @param client - the shared Supabase client, signed in
 * @returns the three cards' data
 * Errors: throws with Supabase's message when the database can't be reached or nobody is signed in.
 */
export async function fetchDiscoverCards(client: AppSupabaseClient): Promise<DiscoverCardsData> {
  // Step 1: ask the database; it applies every rule for this member.
  const { data, error } = await client.rpc('my_discover_cards');
  if (error !== null) throw new Error(`Could not read your cards: ${error.message}`);
  const row = data as unknown as DiscoverCardsRow;
  // Step 2: turn each part into the screen's shape.
  const continuing = row.continue_reading;
  return {
    continueReading:
      continuing === null
        ? null
        : {
            story: toListedStory(continuing.story),
            place: toPlace(continuing.place),
            newChapterNumber: continuing.new_chapter_number,
          },
    draft: toDraft(row.draft),
    mayWrite: row.may_write,
  };
}
