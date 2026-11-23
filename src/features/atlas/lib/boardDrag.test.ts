/**
 * Tests for lib/boardDrag.ts: where a dragged board card lands and the number it would get
 * (CALM-9, board E28).
 */
import { describe, expect, it } from 'vitest';

import type { StorylineAct, StorylineChapter } from '../api/storyline';

import { cardDropId, changesNothing, columnDropId, dropTarget, numberAfterMove } from './boardDrag';

/** A chapter in an act (or none). */
function chapter(code: string, actId: string | null, kind = 'chapter'): StorylineChapter {
  return {
    code,
    position: 0,
    title: code,
    status: 'draft',
    kind: kind as StorylineChapter['kind'],
    planningStatus: 'idea',
    povCharacterId: null,
    povIsNarrator: false,
    actId,
    wordCount: 0,
    wordTarget: null,
    worldDate: '',
    worldSort: null,
  };
}

const acts: StorylineAct[] = [
  { id: 'one', name: 'Act I', position: 1 },
  { id: 'two', name: 'Act II', position: 2 },
];
const book = [
  chapter('pro', 'one', 'prologue'),
  chapter('a', 'one'),
  chapter('b', 'one'),
  chapter('c', 'two'),
  chapter('d', null),
];

/** The place a drag over a zone gives, from the upper half unless told otherwise. */
function targetOver(draggedCode: string, overId: string, isLowerHalf = false) {
  return dropTarget({ chapters: book, acts, draggedCode, overId, isLowerHalf });
}

describe('dropTarget', () => {
  it('puts a card in front of the card it is held over', () => {
    expect(targetOver('c', cardDropId('b'))).toEqual({ actId: 'one', index: 2 });
  });

  it('puts a card behind the card it is held over from that card’s lower half', () => {
    expect(targetOver('c', cardDropId('b'), true)).toEqual({ actId: 'one', index: 3 });
  });

  it('counts places without the dragged card when it moves inside its own act', () => {
    expect(targetOver('a', cardDropId('b'), true)).toEqual({ actId: 'one', index: 2 });
  });

  it('puts a card at the end of a column held over the column’s empty space', () => {
    expect(targetOver('a', columnDropId('two'))).toEqual({ actId: 'two', index: 1 });
    expect(targetOver('a', columnDropId(null))).toEqual({ actId: null, index: 1 });
  });

  it('has no place when the card is held over itself or over something unknown', () => {
    expect(targetOver('a', cardDropId('a'))).toBeNull();
    expect(targetOver('a', 'elsewhere')).toBeNull();
  });
});

describe('changesNothing', () => {
  it('is true for the place the card already has, and false for a new one', () => {
    expect(changesNothing(book, acts, 'b', { actId: 'one', index: 2 })).toBe(true);
    expect(changesNothing(book, acts, 'b', { actId: 'one', index: 1 })).toBe(false);
  });

  it('is false when only the act changes', () => {
    // The last card of Act I dropped first in Act II keeps the book's order but changes act.
    expect(changesNothing(book, acts, 'b', { actId: 'two', index: 0 })).toBe(false);
  });
});

describe('numberAfterMove', () => {
  it('gives the number the card would have, skipping the prologue', () => {
    expect(numberAfterMove(book, acts, 'c', { actId: 'one', index: 1 })).toBe(1);
    expect(numberAfterMove(book, acts, 'a', { actId: null, index: 1 })).toBe(4);
  });

  it('has no number for a prologue', () => {
    expect(numberAfterMove(book, acts, 'pro', { actId: 'two', index: 0 })).toBeNull();
  });
});
