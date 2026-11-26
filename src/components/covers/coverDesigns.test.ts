/**
 * The approved drawn cover designs and their colours (story S1-E3-01; decided 16 Oct 2026).
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';

import {
  classicCoverColourKeys,
  classicOnlyColourKeys,
  coverAccentPart,
  coverColourKeys,
  coverDesignKeys,
  coverDesigns,
  coverPalette,
  defaultChoiceFor,
  titleColourOn,
  titleSurfaceFor,
  writerColourKeys,
  writerCoverDesignKeys,
  writerCoverDesigns,
} from './coverDesigns';
import { coverArtwork } from './coverArtwork';

describe('cover designs', () => {
  it('are the 22 approved backgrounds: 9 plain colours, 10 patterns and the 3 new ones', () => {
    expect(writerCoverDesigns).toHaveLength(22);
    expect(writerCoverDesigns.filter((design) => design.kind === 'plain')).toHaveLength(9);
    expect(writerCoverDesigns.filter((design) => design.kind !== 'plain')).toHaveLength(13);
    expect(coverDesigns.map((design) => design.key)).toEqual([...coverDesignKeys]);
    expect(writerCoverDesigns.map((design) => design.key)).toEqual([...writerCoverDesignKeys]);
    // G9c's three and the brand page's three (23 Nov 2026) are marked "New" and come last.
    expect(
      coverDesigns.filter((design) => design.isNew === true).map((design) => design.key),
    ).toEqual(['arches', 'rings', 'forestwaves', 'blushdots', 'skylines', 'goldgrid']);
  });

  it('use a 9-colour palette, and every default colour is in it', () => {
    expect(writerColourKeys).toHaveLength(9);
    for (const design of writerCoverDesigns) {
      expect(writerColourKeys).toContain(design.background);
      expect(writerColourKeys).toContain(design.accent);
    }
  });

  it('keep the classic covers’ 6 plain colours and 3 artworks to the classics', () => {
    // Robert, 26 Nov 2026: classics are solid colours, except three with artwork.
    const classicDesigns = coverDesigns.filter((design) => design.classicOnly === true);
    expect(coverDesigns).toHaveLength(31);
    expect(classicDesigns.map((design) => design.key)).toEqual([
      'crimson',
      'seaglass',
      'peach',
      'pistachio',
      'candy',
      'linkblue',
      'classic_luceafarul',
      'classic_the_raven',
      'classic_goblin_market',
    ]);
    expect(classicDesigns.filter((design) => design.artworkUrl !== undefined)).toHaveLength(3);
    expect(coverColourKeys).toHaveLength(15);
    expect(classicCoverColourKeys).toHaveLength(10);
    for (const colour of classicCoverColourKeys) expect(coverColourKeys).toContain(colour);
    for (const colour of classicOnlyColourKeys) expect(writerColourKeys).not.toContain(colour);
  });

  it('give the title at least 4.5:1 on every classic colour', () => {
    for (const colour of classicCoverColourKeys) {
      const surface = coverPalette[colour];
      expect(contrastRatio(surface, titleColourOn(surface))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('give the title at least 4.5:1 contrast for every background and accent pair', () => {
    // Every design × background × accent: 22 × 9 × 9 = 1,782 choices.
    const choices = writerCoverDesigns.flatMap((design) =>
      writerColourKeys.flatMap((background) =>
        writerColourKeys.map((accent) => ({ design: design.key, background, accent })),
      ),
    );
    const weakPairs = choices
      .map((choice) => {
        const { surface } = titleSurfaceFor(choice);
        return { choice, ratio: contrastRatio(surface, titleColourOn(surface)) };
      })
      .filter((pair) => pair.ratio < 4.5);
    expect(choices).toHaveLength(1782);
    expect(weakPairs).toEqual([]);
  });

  it('put a solid box behind the title on every patterned design, so no line crosses it', () => {
    // Bundle FIXES-1b (Robert, 5 Nov 2026): the grid's lines used to run through the title.
    const choices = writerCoverDesigns.flatMap((design) =>
      writerColourKeys.flatMap((background) =>
        writerColourKeys.map((accent) => ({ design, background, accent })),
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
    // G9c: the board's blues and greens map to the nearest palette pair (docs/board-fixes.md).
    expect(defaultChoiceFor('arches')).toEqual({
      design: 'arches',
      background: 'ink',
      accent: 'violet',
    });
    expect(defaultChoiceFor('forestwaves').background).toBe('sage');
    // The brand page's tonal shades are outside the palette, so each takes a palette accent.
    expect(defaultChoiceFor('blushdots')).toEqual({
      design: 'blushdots',
      background: 'blush',
      accent: 'plum',
    });
    expect(defaultChoiceFor('skylines').background).toBe('sky');
    expect(defaultChoiceFor('goldgrid').accent).toBe('paper');
  });

  it('draw the brand page patterns in the accent colour, as artwork on the cover', () => {
    expect(coverArtwork('blushdots').fillPath).not.toBe('');
    expect(coverArtwork('skylines').strokePath).not.toBe('');
    expect(coverArtwork('goldgrid').strokePath).not.toBe('');
    expect(coverAccentPart('goldgrid')).toBe('pattern');
  });
});
