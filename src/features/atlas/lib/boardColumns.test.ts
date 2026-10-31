/**
 * Tests for lib/boardColumns.ts: the board's columns, moves and chapter numbers (S1-E17-19).
 */
import { describe, expect, it } from 'vitest';

import type { StorylineAct, StorylineChapter } from '../api/storyline';

import { boardColumns, chapterNumbers, orderAfterMove } from './boardColumns';

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
  { id: 'three', name: 'Act III', position: 3 },
];
const book = [chapter('a', 'one'), chapter('b', 'one'), chapter('c', 'two'), chapter('d', null)];

describe('boardColumns', () => {
  it('puts each chapter in its act, in book order, with "No act" last', () => {
    const columns = boardColumns(book, acts);
    expect(columns.map((column) => column.chapters.map((each) => each.code))).toEqual([
      ['a', 'b'],
      ['c'],
      [],
      ['d'],
    ]);
    expect(columns[3]?.actId).toBeNull();
  });

  it('puts a chapter whose act is gone under "No act"', () => {
    const columns = boardColumns([chapter('x', 'gone')], acts);
    expect(columns[3]?.chapters.map((each) => each.code)).toEqual(['x']);
  });
});

describe('orderAfterMove', () => {
  it('moves a chapter earlier inside its act', () => {
    expect(orderAfterMove(book, acts, 'b', { actId: 'one', index: 0 })).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('moves a chapter to the end of another act', () => {
    expect(orderAfterMove(book, acts, 'a', { actId: 'two', index: 1 })).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('moves a chapter into an empty act after the earlier acts’ chapters', () => {
    expect(orderAfterMove(book, acts, 'a', { actId: 'three', index: 0 })).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('puts a chapter first when it goes to an empty first act', () => {
    const loose = [chapter('a', null), chapter('b', null)];
    expect(orderAfterMove(loose, acts, 'b', { actId: 'one', index: 0 })).toEqual(['b', 'a']);
  });

  it('moves a chapter to the start of "No act"', () => {
    expect(orderAfterMove(book, acts, 'a', { actId: null, index: 0 })).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });
});

describe('chapterNumbers', () => {
  it('numbers only chapters, so a prologue leaves the first chapter as Chapter 1', () => {
    const numbers = chapterNumbers([
      chapter('p', null, 'prologue'),
      chapter('a', null),
      chapter('i', null, 'interlude'),
      chapter('b', null),
    ]);
    expect([...numbers.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });
});
