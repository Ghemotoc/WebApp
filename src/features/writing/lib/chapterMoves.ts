/**
 * Small rules for Manage chapters that need no screen (story S1-E3-04; liquid glass Chapters
 * board, bundle G9 WRITING, part d):
 * - which chapter a move or a new order moves, and the number it gets, so the page can ask
 *   before a published chapter changes number (readers already know it by that number);
 * - the three numbers in the "This story in numbers" row: chapters, words and the next
 *   scheduled chapter.
 *
 * Who calls it: ManageChaptersPage (the move question) and ChapterStats (the numbers).
 * What it calls: nothing outside this feature. Kept apart from the components so it can be
 * tested on its own (chapterMoves.test.ts).
 */
import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';

/** The chapter a change moves and the number it will have afterwards. */
export interface ChapterMove {
  chapter: ManagedChapter;
  newNumber: number;
}

/**
 * Works out which chapter a move or a new order moves and where it lands.
 *
 * @param change - the change the page is about to send
 * @param chapters - the live chapters in their order now
 * @returns the moved chapter and its new number, or null for any other change (or a move
 *   that changes nothing, such as "up" on the first chapter)
 */
export function chapterMoveOf(
  change: ChapterChange,
  chapters: ManagedChapter[],
): ChapterMove | null {
  // Step 1: find the moved chapter's code and its place in the new order.
  let movedCode: string;
  let newIndex: number;
  if (change.kind === 'move') {
    movedCode = change.code;
    newIndex = chapters.findIndex((chapter) => chapter.code === change.code) + change.direction;
  } else if (change.kind === 'order' && change.movedCode !== undefined) {
    movedCode = change.movedCode;
    newIndex = change.codes.indexOf(change.movedCode);
  } else {
    return null;
  }

  // Step 2: a place outside the list, or the same place, is not a move.
  const oldIndex = chapters.findIndex((chapter) => chapter.code === movedCode);
  const moved = chapters[oldIndex];
  if (moved === undefined || newIndex < 0 || newIndex >= chapters.length || newIndex === oldIndex) {
    return null;
  }
  return { chapter: moved, newNumber: newIndex + 1 };
}

/**
 * Whether the page should ask before this change: only when it gives a published chapter a
 * new number. Drafts, scheduled and unpublished chapters have no readers to surprise.
 *
 * @param move - the move, from chapterMoveOf()
 * @returns true when the writer is asked first
 */
export function needsMoveQuestion(move: ChapterMove | null): move is ChapterMove {
  return move !== null && move.chapter.state === 'published';
}

/** The numbers in the "This story in numbers" row. */
export interface StoryNumbers {
  chapterCount: number;
  wordCount: number;
  /** When the next scheduled chapter goes live, or null when none is scheduled. */
  nextScheduledFor: string | null;
}

/**
 * Adds up the numbers for the row above the list.
 *
 * @param chapters - the live chapters
 * @returns the chapter count, the words in every chapter and the next scheduled time
 */
export function storyNumbers(chapters: ManagedChapter[]): StoryNumbers {
  // The earliest time among scheduled chapters; ISO timestamps in UTC sort as text.
  const scheduledTimes = chapters
    .filter((chapter) => chapter.state === 'scheduled' && chapter.scheduledFor !== null)
    .map((chapter) => new Date(chapter.scheduledFor ?? '').toISOString())
    .sort();
  return {
    chapterCount: chapters.length,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
    nextScheduledFor: scheduledTimes[0] ?? null,
  };
}
