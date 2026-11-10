/**
 * Reads and changes a story's storyline: the chapter board, the timeline and the point-of-view
 * lanes (stories S1-E17-19 to S1-E17-22; bundle ATLAS, part f).
 *
 * Who calls it: hooks/useStoryline.ts and hooks/useBoardMoves.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_19_storyline.sql):
 * - story_storyline(): the chapters in book order with their planning, the acts, the characters
 *   and the timeline's events;
 * - place_chapter_on_board(): a move on the board, which asks first when readers would see a
 *   new order (S1-E3-04);
 * - add_chapter_to_act(): "Add chapter" on an act;
 * - add_story_event(), update_story_event() and delete_story_event(): the timeline.
 * All of it is private: only the writer reads it (story_events_select_own and the others).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterKind, PlanningStatus } from './chapterPlans';
import { checkedAnswer } from './checkedAnswer';

/** One chapter as the three views draw it. */
export interface StorylineChapter {
  code: string;
  /** Its place in the book, from 1: the order readers see (S1-E3-04). */
  position: number;
  title: string;
  /** The reader-side status: draft, scheduled or published. */
  status: string;
  kind: ChapterKind;
  planningStatus: PlanningStatus;
  povCharacterId: string | null;
  /** True when the Narrator, outside the story, tells it (G10c2). */
  povIsNarrator: boolean;
  /** The act it sits in, or null for "No act". */
  actId: string | null;
  wordCount: number;
  wordTarget: number | null;
  worldDate: string;
  /** Where it sorts on the timeline, or null while it has no in-world date. */
  worldSort: number | null;
}

/** One act of the plan (S1-E17-01). */
export interface StorylineAct {
  id: string;
  name: string;
  position: number;
}

/** One in-world event on the timeline (S1-E17-20). */
export interface StoryEvent {
  id: string;
  title: string;
  displayDate: string;
  sortValue: number;
  description: string;
}

/** Everything the storyline page draws. */
export interface Storyline {
  storyTitle: string;
  chapters: StorylineChapter[];
  acts: StorylineAct[];
  characters: { id: string; name: string }[];
  events: StoryEvent[];
}

/** The cache key of a story's storyline. */
export const storylineQueryKey = (userId: string | null, slug: string) => [
  'storyline',
  userId,
  slug,
];

/** story_storyline()'s chapters and events, as the database writes them. */
interface StorylineRow {
  title: string;
  chapters: {
    code: string;
    position: number;
    title: string;
    status: string;
    kind: ChapterKind;
    planning_status: PlanningStatus;
    pov_character_id: string | null;
    pov_is_narrator: boolean;
    act_id: string | null;
    word_count: number;
    word_target: number | null;
    world_date: string;
    world_sort: number | null;
  }[];
  acts: StorylineAct[];
  characters: { id: string; name: string }[];
  events: {
    id: string;
    title: string;
    display_date: string;
    sort_value: number;
    description: string;
  }[];
}

/** One chapter of the answer, in the screen's words. */
function chapterFrom(row: StorylineRow['chapters'][number]): StorylineChapter {
  return {
    code: row.code,
    position: row.position,
    title: row.title,
    status: row.status,
    kind: row.kind,
    planningStatus: row.planning_status,
    povCharacterId: row.pov_character_id,
    povIsNarrator: row.pov_is_narrator,
    actId: row.act_id,
    wordCount: row.word_count,
    wordTarget: row.word_target,
    worldDate: row.world_date,
    worldSort: row.world_sort,
  };
}

/**
 * Reads a story's storyline.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the storyline, or null when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryline(
  client: AppSupabaseClient,
  slug: string,
): Promise<Storyline | null> {
  const answer = await client.rpc('story_storyline', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the storyline', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  const row = data as unknown as StorylineRow;
  return {
    storyTitle: row.title,
    chapters: row.chapters.map(chapterFrom),
    acts: row.acts,
    characters: row.characters,
    events: row.events.map((event) => ({
      id: event.id,
      title: event.title,
      displayDate: event.display_date,
      sortValue: Number(event.sort_value),
      description: event.description,
    })),
  };
}

/** One move on the board: the chapter, its act and the whole book's new order. */
export interface BoardMove {
  chapterCode: string;
  /** The act it goes to, or null for "No act". */
  actId: string | null;
  /** Every chapter's code in the new order. */
  order: string[];
}

/**
 * Saves a move on the board (S1-E17-19).
 *
 * @param move - the chapter, its act and the new order
 * @param isConfirmed - true once the writer agreed readers will see a new order
 * @returns 'ok', or 'needs_confirmation' when published chapters would change order (nothing
 *   moved yet)
 * Errors: throws when the board was out of date ('wrong_list'), the writer can't change it now,
 *   or the database can't be reached.
 */
export async function placeChapterOnBoard(
  client: AppSupabaseClient,
  move: BoardMove,
  isConfirmed: boolean,
): Promise<'ok' | 'needs_confirmation'> {
  const answer = await client.rpc('place_chapter_on_board', {
    chapter_code: move.chapterCode,
    act_id: move.actId ?? '',
    chapter_codes: move.order,
    confirmed: isConfirmed,
  });
  const data = checkedAnswer(answer, 'move the chapter', ['ok', 'needs_confirmation']);
  return data.outcome === 'needs_confirmation' ? 'needs_confirmation' : 'ok';
}

/**
 * Adds a draft chapter at the end of an act (S1-E17-19: "Add chapter" on a column).
 *
 * @param actId - the act, or null for the "No act" column (the end of the book)
 * @returns the new chapter's code
 * Errors: throws when the writer can't add chapters now or the database can't be reached.
 */
export async function addChapterToAct(
  client: AppSupabaseClient,
  slug: string,
  actId: string | null,
): Promise<string> {
  const answer = await client.rpc('add_chapter_to_act', { story_slug: slug, act_id: actId ?? '' });
  const data = checkedAnswer(answer, 'add the chapter');
  return String(data.code);
}

/** A new event as the form gives it. */
export interface NewStoryEvent {
  title: string;
  displayDate: string;
  sortValue: number;
  description: string;
}

/**
 * Adds an event to the timeline (S1-E17-20).
 *
 * Errors: throws when the title is empty, the timeline is full (500) or the database can't be
 *   reached.
 */
export async function addStoryEvent(client: AppSupabaseClient, slug: string, event: NewStoryEvent) {
  const answer = await client.rpc('add_story_event', {
    story_slug: slug,
    event_title: event.title,
    display_date: event.displayDate,
    sort_value: event.sortValue,
    description: event.description,
  });
  checkedAnswer(answer, 'add the event');
}

/** One change to an event, keyed as the database names its fields. */
export interface StoryEventChange {
  title?: string;
  display_date?: string;
  sort_value?: number;
  description?: string;
}

/**
 * Saves one change to an event (each field saves by itself).
 *
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveStoryEventChange(
  client: AppSupabaseClient,
  eventId: string,
  change: StoryEventChange,
) {
  const answer = await client.rpc('update_story_event', {
    event_id: eventId,
    changes: { ...change },
  });
  checkedAnswer(answer, 'save the event');
}

/**
 * Deletes an event (the screen asks twice first).
 *
 * Errors: throws when the database can't be reached or the event isn't the writer's.
 */
export async function deleteStoryEvent(client: AppSupabaseClient, eventId: string) {
  const answer = await client.rpc('delete_story_event', { event_id: eventId });
  checkedAnswer(answer, 'delete the event');
}
