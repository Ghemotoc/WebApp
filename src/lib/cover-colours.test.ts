/**
 * Every drawn cover's title stays readable on its background (story S1-E1-03; WCAG 2.2 AA).
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';
import { coverColours } from './cover-colours';

describe('cover colours', () => {
  it('give every drawn title at least 4.5:1 against its cover', () => {
    const weakPairs = Object.entries(coverColours)
      .map(([tone, colours]) => ({ tone, ratio: contrastRatio(colours.title, colours.background) }))
      .filter((pair) => pair.ratio < 4.5);

    expect(weakPairs).toEqual([]);
  });
});
