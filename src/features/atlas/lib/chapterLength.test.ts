/**
 * Unit tests for the long-chapter warning (story S1-E17-23; lib/chapterLength.ts).
 */
import { describe, expect, it } from 'vitest';

import { MAXIMUM_CHAPTER_CHARACTERS } from '@/schemas/chapter';

import { isNearChapterLimit } from './chapterLength';

describe('isNearChapterLimit', () => {
  it('stays quiet for an ordinary chapter', () => {
    expect(isNearChapterLimit(20_000)).toBe(false);
  });

  it('warns from nine tenths of the limit', () => {
    expect(isNearChapterLimit(MAXIMUM_CHAPTER_CHARACTERS * 0.9 - 1)).toBe(false);
    expect(isNearChapterLimit(MAXIMUM_CHAPTER_CHARACTERS * 0.9)).toBe(true);
  });
});
