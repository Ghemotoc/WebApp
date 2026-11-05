/**
 * The approved drawn cover designs and their colours (story S1-E3-01; decided 16 Oct 2026).
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';

import {
  coverColourKeys,
  coverDesignKeys,
  coverDesigns,
  coverPalette,
  defaultChoiceFor,
  titleColourOn,
  titleSurfaceFor,
} from './coverDesigns';

describe('cover designs', () => {
  it('are the 16 approved backgrounds: 9 plain colours and 7 patterns', () => {
    expect(coverDesigns).toHaveLength(16);
    expect(coverDesigns.filter((design) => design.kind === 'plain')).toHaveLength(9);
    expect(coverDesigns.filter((design) => design.kind !== 'plain')).toHaveLength(7);
    expect(coverDesigns.map((design) => design.key)).toEqual([...coverDesignKeys]);
  });

  it('use a 9-colour palette, and every default colour is in it', () => {
    expect(coverColourKeys).toHaveLength(9);
    for (const design of coverDesigns) {
      expect(coverColourKeys).toContain(design.background);
      expect(coverColourKeys).toContain(design.accent);
    }
  });

  it('give the title at least 4.5:1 contrast for every background and accent pair', () => {
    // Every design × background × accent: 16 × 9 × 9 = 1,296 choices.
    const choices = coverDesigns.flatMap((design) =>
      coverColourKeys.flatMap((background) =>
        coverColourKeys.map((accent) => ({ design: design.key, background, accent })),
      ),
    );
    const weakPairs = choices
      .map((choice) => {
        const { surface } = titleSurfaceFor(choice);
        return { choice, ratio: contrastRatio(surface, titleColourOn(surface)) };
      })
      .filter((pair) => pair.ratio < 4.5);
    expect(choices).toHaveLength(1296);
    expect(weakPairs).toEqual([]);
  });

  it('put a solid box behind the title on every patterned design, so no line crosses it', () => {
    // Bundle FIXES-1b (Robert, 5 Nov 2026): the grid's lines used to run through the title.
    const choices = coverDesigns.flatMap((design) =>
      coverColourKeys.flatMap((background) =>
        coverColourKeys.map((accent) => ({ design, background, accent })),
      ),
    );
    for (const { design, background, accent } of choices) {
      const { boxFill, surface } = titleSurfaceFor({ design: design.key, background, accent });
      // A plain cover has no pattern, so no box; on every other design the box is the colour the
      // title is read against.
      const expectedBox = design.kind === 'plain' ? null : surface;
      expect(boxFill).toBe(expectedBox);
    }
  });

  it('read the grid design’s title clearly even when its lines are the title’s colour', () => {
    // The case Robert saw: dark lines on paper, and a dark title on top of them.
    const { boxFill, surface } = titleSurfaceFor({
      design: 'grid',
      background: 'paper',
      accent: 'ink',
    });
    expect(boxFill).toBe(coverPalette.paper);
    expect(contrastRatio(surface, titleColourOn(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('gives each design its board default colours', () => {
    expect(defaultChoiceFor('stripes')).toEqual({
      design: 'stripes',
      background: 'plum',
      accent: 'gold',
    });
    // Waves: the board's blue is outside the palette, so Violet stands in (docs/board-fixes.md).
    expect(defaultChoiceFor('waves').accent).toBe('violet');
    expect(coverPalette.plum).toBe('#481C5F');
  });
});
