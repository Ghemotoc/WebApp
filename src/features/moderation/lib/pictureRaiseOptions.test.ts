/**
 * Tests for raiseOptionsFor(): which ratings the yellow button offers (bundle ADMIN-2, part e1b).
 */
import { describe, expect, it } from 'vitest';

import type { PictureToCheck } from '../api/picturesToCheck';

import { raiseOptionsFor } from './pictureRaiseOptions';

/** A waiting cover by an adult in an adult's All ages story; each test changes one thing. */
function pictureWith(changes: Partial<PictureToCheck>): PictureToCheck {
  return {
    caseId: 'case',
    pictureId: 'picture',
    kind: 'cover',
    uploaderHandle: 'inkwolf',
    uploaderAgeBand: '18_plus',
    uploaderLocale: 'en',
    story: { id: 'story', title: 'Zidul', slug: 'zidul', rating: 'all_ages' },
    ownerAgeBand: '18_plus',
    waitingSince: '2026-11-03T08:00:00Z',
    url: null,
    ...changes,
  };
}

describe('the ratings the yellow button offers', () => {
  it('offers 18+ and 16+ for an adult’s picture in an adult’s story', () => {
    expect(raiseOptionsFor(pictureWith({}))).toEqual(['18_plus', '16_plus']);
  });

  it('offers only 16+ when the picture comes from someone under 18', () => {
    expect(
      raiseOptionsFor(pictureWith({ uploaderAgeBand: '16_to_17', ownerAgeBand: '16_to_17' })),
    ).toEqual(['16_plus']);
  });

  it('offers nothing when the story’s owner is under 16', () => {
    expect(raiseOptionsFor(pictureWith({ ownerAgeBand: '13_to_15' }))).toEqual([]);
  });

  it('offers nothing for a picture outside a story', () => {
    expect(raiseOptionsFor(pictureWith({ story: null, ownerAgeBand: null }))).toEqual([]);
  });
});
