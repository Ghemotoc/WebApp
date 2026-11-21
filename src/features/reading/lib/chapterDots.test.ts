/**
 * Tests for chapterDots (bundle CALM-5): the chapter navigation's dots.
 */
import { describe, expect, it } from 'vitest';

import { chapterDots } from './chapterDots';

describe('the chapter dots', () => {
  it('draws one dot per chapter, the current one marked, for a short story', () => {
    const dots = chapterDots(3, 5);
    expect(dots.map((dot) => dot.kind)).toEqual(['read', 'read', 'current', 'ahead', 'ahead']);
  });

  it('shows the 15 around the current chapter in a long story', () => {
    const dots = chapterDots(20, 40);
    expect(dots).toHaveLength(15);
    expect(dots[0]?.number).toBe(13);
    expect(dots[14]?.number).toBe(27);
    expect(dots.find((dot) => dot.kind === 'current')?.number).toBe(20);
  });

  it('keeps 15 dots at the start and the end of a long story', () => {
    expect(chapterDots(1, 40).map((dot) => dot.number)).toEqual(
      [...Array(15).keys()].map((index) => index + 1),
    );
    expect(chapterDots(40, 40)[0]?.number).toBe(26);
  });
});
