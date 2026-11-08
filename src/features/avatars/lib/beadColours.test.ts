/**
 * Tests for the initials bead colours (bundle G3 COMPONENTS; design rules 2026-11-07, "Initials
 * colours").
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';

import { beadColourFor, beadColours } from './beadColours';

describe('beadColours', () => {
  it('has the sixteen colours the design rules name', () => {
    expect(beadColours.map((bead) => bead.name)).toEqual([
      'plum',
      'violet',
      'ink',
      'gold',
      'blush',
      'sky',
      'sage',
      'lilac',
      'paper',
      'cobalt',
      'forest',
      'indigo',
      'ember',
      'berry',
      'cherry',
      'slate',
    ]);
  });

  it.each(beadColours)('keeps the initials on the $name bead at 4.5:1 or better', (bead) => {
    expect(contrastRatio(bead.initials, bead.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives light beads the dark initials #26142E', () => {
    const lightBeads = beadColours.filter((bead) => bead.initials !== '#FFFFFF');
    expect(lightBeads.map((bead) => bead.name)).toEqual([
      'gold',
      'blush',
      'sky',
      'sage',
      'lilac',
      'paper',
    ]);
    lightBeads.forEach((bead) => expect(bead.initials).toBe('#26142E'));
  });

  it('gives the same person the same bead every time, whatever the letter case', () => {
    expect(beadColourFor('inkwolf')).toEqual(beadColourFor('InkWolf'));
  });

  it('spreads different people over different beads', () => {
    const handles = ['inkwolf', 'lia', 'adult_writer', 'teen_17', 'moderator', 'mara', 'ion'];
    const picked = new Set(handles.map((handle) => beadColourFor(handle).name));
    expect(picked.size).toBeGreaterThan(3);
  });
});
