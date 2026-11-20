/**
 * Tests for the circle colours behind a member's initials (bundle CALM-3; design system
 * Avatar/README.md: seven cover palette colours, light ones with ink initials).
 */
import { describe, expect, it } from 'vitest';

import { coverPalette } from '@/components/covers/coverDesigns';
import { contrastRatio } from '@/lib/contrast';

import { beadColourFor, beadColourNames, beadColours, isBeadColourName } from './beadColours';

describe('beadColours', () => {
  it('has the seven cover palette colours the handover names', () => {
    expect(beadColours.map((bead) => bead.name)).toEqual([
      'plum',
      'violet',
      'gold',
      'lilac',
      'blush',
      'sky',
      'sage',
    ]);
  });

  it('lists the circles in the order of the names the database keeps (initials_colour_names())', () => {
    expect(beadColours.map((bead) => bead.name)).toEqual([...beadColourNames]);
  });

  it('takes every circle colour from the cover palette, never a new hex code', () => {
    beadColours.forEach((bead) => expect(bead.background).toBe(coverPalette[bead.name]));
  });

  it.each(beadColours)('keeps the initials on the $name circle at 4.5:1 or better', (bead) => {
    expect(contrastRatio(bead.initials, bead.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives plum and violet paper initials and the five light circles ink initials', () => {
    const paperCircles = beadColours.filter((bead) => bead.initials === coverPalette.paper);
    expect(paperCircles.map((bead) => bead.name)).toEqual(['plum', 'violet']);
    const inkCircles = beadColours.filter((bead) => bead.initials === coverPalette.ink);
    expect(inkCircles.map((bead) => bead.name)).toEqual(['gold', 'lilac', 'blush', 'sky', 'sage']);
  });

  it('gives the same person the same circle every time, whatever the letter case', () => {
    expect(beadColourFor('inkwolf')).toEqual(beadColourFor('InkWolf'));
  });

  it('uses the person’s stored colour, whatever their username', () => {
    expect(beadColourFor('inkwolf', 'sky').name).toBe('sky');
    expect(beadColourFor('inkwolf', null)).toEqual(beadColourFor('inkwolf'));
  });

  it('knows the seven names and nothing else, the retired ones included', () => {
    expect(isBeadColourName('sage')).toBe(true);
    expect(isBeadColourName('cobalt')).toBe(false);
    expect(isBeadColourName('neon')).toBe(false);
  });

  it('spreads deleted accounts over different circles', () => {
    const names = ['inkwolf', 'lia', 'adult_writer', 'teen_17', 'moderator', 'mara', 'ion'];
    const picked = new Set(names.map((name) => beadColourFor(name).name));
    expect(picked.size).toBeGreaterThan(3);
  });
});
