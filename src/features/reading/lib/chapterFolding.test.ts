/**
 * Tests for folding a long chapter list (CALM-9, board B01).
 */
import { describe, expect, it } from 'vitest';

import type { StoryPageChapter } from '../api/storyPage';
import { foldedChapterCodes } from './chapterFolding';

/** A list of chapters numbered 1 to count, with codes "c1", "c2" and so on. */
function chaptersUpTo(count: number): StoryPageChapter[] {
  return Array.from(
    { length: count },
    (_, index) => ({ code: `c${index + 1}`, number: index + 1 }) as StoryPageChapter,
  );
}

describe('folding a long chapter list', () => {
  it('a story with 11 chapters or fewer shows every chapter', () => {
    expect(foldedChapterCodes(chaptersUpTo(11), null).size).toBe(0);
  });

  it('a story with 15 chapters shows 1 to 10 and the latest', () => {
    expect([...foldedChapterCodes(chaptersUpTo(15), null)]).toEqual(['c11', 'c12', 'c13', 'c14']);
  });

  it("the reader's own chapter stays in sight", () => {
    expect(foldedChapterCodes(chaptersUpTo(15), 'c12').has('c12')).toBe(false);
  });
});
