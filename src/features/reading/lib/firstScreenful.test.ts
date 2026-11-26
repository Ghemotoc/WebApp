/**
 * Tests for firstScreenful (the reader speed check, 25 Nov 2026): the opening blocks a chapter's
 * first draw holds.
 */
import { describe, expect, it } from 'vitest';

import { chapterBlocks } from '@/lib/chapter-blocks';

import { firstScreenful } from './firstScreenful';

/** A chapter of this many one-line paragraphs. */
function paragraphs(count: number): string {
  return Array.from({ length: count }, (_, index) => `Paragraph ${String(index + 1)}.`).join(
    '\n\n',
  );
}

describe('the first screenful of a chapter', () => {
  it('keeps the first blocks and leaves the rest for the next frame', () => {
    const opening = firstScreenful(paragraphs(30), 12);
    expect(chapterBlocks(opening).map((block) => block.text)).toEqual(
      chapterBlocks(paragraphs(12)).map((block) => block.text),
    );
  });

  it('gives each kept block the number it has in the whole chapter', () => {
    const whole =
      'Intro.\n\n## A heading\n\n> A quote\n> on two lines\n\nThe fourth.\n\nThe fifth.';
    const opening = firstScreenful(whole, 3);
    expect(chapterBlocks(opening)).toEqual(chapterBlocks(whole).slice(0, 3));
  });

  it('draws a short chapter whole at once', () => {
    expect(firstScreenful(paragraphs(5), 12)).toBe(paragraphs(5));
    expect(firstScreenful(paragraphs(12), 12)).toBe(paragraphs(12));
  });

  it('keeps at least one block', () => {
    expect(chapterBlocks(firstScreenful(paragraphs(3), 0))).toHaveLength(1);
  });
});
