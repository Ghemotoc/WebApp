/**
 * Tests for lib/chapterMoves.ts: which moves ask first and the "This story in numbers" row
 * (story S1-E3-04; bundle G9 WRITING, part d).
 */
import { describe, expect, it } from 'vitest';

import type { ManagedChapter, ManagedChapterState } from '../api/manageChapters';

import { chapterMoveOf, needsMoveQuestion, storyNumbers } from './chapterMoves';

/** A live chapter with only the fields these rules read set on purpose. */
function chapter(
  code: string,
  state: ManagedChapterState,
  extra: Partial<ManagedChapter> = {},
): ManagedChapter {
  return {
    code,
    position: 0,
    title: code,
    state,
    wordCount: 0,
    draftSavedAt: null,
    firstPublishedAt: null,
    editedAt: null,
    scheduledFor: null,
    unpublishedAt: null,
    deletedAt: null,
    ...extra,
  };
}

const chapters = [
  chapter('one', 'published', { wordCount: 1200 }),
  chapter('two', 'published', { wordCount: 800 }),
  chapter('three', 'draft', { wordCount: 228 }),
  chapter('four', 'scheduled', { scheduledFor: '2027-03-02T16:00:00Z' }),
  chapter('five', 'scheduled', { scheduledFor: '2027-03-01T16:00:00+00:00' }),
];

describe('chapterMoveOf and needsMoveQuestion', () => {
  it('moving a published chapter up gives it the number above, and asks first', () => {
    const move = chapterMoveOf({ kind: 'move', code: 'two', direction: -1 }, chapters);
    expect(move?.chapter.code).toBe('two');
    expect(move?.newNumber).toBe(1);
    expect(needsMoveQuestion(move)).toBe(true);
  });

  it('a dragged order names the dragged chapter and where it lands', () => {
    const move = chapterMoveOf(
      { kind: 'order', codes: ['two', 'three', 'one', 'four', 'five'], movedCode: 'one' },
      chapters,
    );
    expect(move?.newNumber).toBe(3);
    expect(needsMoveQuestion(move)).toBe(true);
  });

  it('a draft moves without a question', () => {
    const move = chapterMoveOf({ kind: 'move', code: 'three', direction: -1 }, chapters);
    expect(move?.newNumber).toBe(2);
    expect(needsMoveQuestion(move)).toBe(false);
  });

  it('"up" on the first chapter is not a move', () => {
    expect(chapterMoveOf({ kind: 'move', code: 'one', direction: -1 }, chapters)).toBeNull();
  });

  it('a rename, or an order without the dragged chapter, is not a move', () => {
    expect(chapterMoveOf({ kind: 'rename', code: 'one', title: 'New' }, chapters)).toBeNull();
    expect(chapterMoveOf({ kind: 'order', codes: ['two', 'one'] }, chapters)).toBeNull();
  });
});

describe('storyNumbers', () => {
  it('counts the chapters, adds up the words and finds the earliest scheduled chapter', () => {
    expect(storyNumbers(chapters)).toEqual({
      chapterCount: 5,
      wordCount: 2228,
      nextScheduledFor: '2027-03-01T16:00:00.000Z',
    });
  });

  it('says nothing is scheduled when no chapter is', () => {
    expect(storyNumbers(chapters.slice(0, 3)).nextScheduledFor).toBeNull();
  });
});
