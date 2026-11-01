/**
 * Unit tests for a shared story's preview (bundle IDEAS-1, part c; idea IDEA-20261031-11).
 */
import { describe, expect, it } from 'vitest';

import { coverPalette } from '@/components/covers/coverDesigns';

import { showsTitleOnly, storyPreviewColour, type SharedStory } from './sharedStory';

const story: SharedStory = {
  slug: 'statia-meteo',
  title: 'Stația meteo',
  writerName: 'inkwolf',
  blurb: 'Ploua.',
  rating: 'all_ages',
  coverBackground: 'sage',
};

describe('a shared story’s preview', () => {
  it('uses the drawn cover’s background colour', () => {
    expect(storyPreviewColour(story)).toBe(coverPalette.sage);
  });

  it('uses plum for an automatic or uploaded cover', () => {
    expect(storyPreviewColour({ ...story, coverBackground: null })).toBe(coverPalette.plum);
  });

  it('shows only the title and rating, on plum, for a 16+ or 18+ story', () => {
    expect(showsTitleOnly('16_plus')).toBe(true);
    expect(showsTitleOnly('18_plus')).toBe(true);
    expect(showsTitleOnly('13_plus')).toBe(false);
    expect(storyPreviewColour({ ...story, rating: '18_plus' })).toBe(coverPalette.plum);
  });
});
