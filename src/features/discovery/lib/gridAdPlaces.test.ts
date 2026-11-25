/**
 * Tests for gridAdPlaces (bundle G7e; Robert, 20 Nov 2026: "a banner every two rows"): where the
 * banners go in a long grid of stories.
 */
import { describe, expect, it } from 'vitest';

import { isAdAfterStory, storiesBetweenBanners } from './gridAdPlaces';

/**
 * The story numbers an ad follows in a grid of this many stories.
 *
 * @param storyCount - how many stories the grid shows
 * @param firstAfter - the story the first ad follows
 * @param storiesBetween - how many stories apart the ads are
 * @param isShortListAdded - the short-list rule
 * @returns the story numbers an ad follows
 */
function adPlaces(
  storyCount: number,
  firstAfter: number,
  storiesBetween = 10,
  isShortListAdded = true,
): number[] {
  const places: number[] = [];
  for (let storyNumber = 1; storyNumber <= storyCount; storyNumber += 1) {
    const adPlacesInGrid = { firstAfter, storiesBetween, isShortListAdded };
    if (isAdAfterStory(storyNumber, storyCount, adPlacesInGrid)) places.push(storyNumber);
  }
  return places;
}

describe('how far apart the banners are', () => {
  it('puts a banner after every two rows on a computer, which is 10 stories at five a row', () => {
    expect(storiesBetweenBanners(5)).toBe(10);
  });

  it('keeps whole rows on a tablet: three rows of four, the first that reach 10 stories', () => {
    expect(storiesBetweenBanners(4)).toBe(12);
  });

  it('never puts banners closer than 10 stories on a phone, where a row holds two', () => {
    expect(storiesBetweenBanners(2)).toBe(10);
  });

  it('treats a grid without columns as one card a row', () => {
    expect(storiesBetweenBanners(0)).toBe(10);
  });
});

describe('ads in a long grid of stories', () => {
  it('puts a banner after every two rows of five, so each Show more brings more in', () => {
    expect(adPlaces(20, 10)).toEqual([10]);
    expect(adPlaces(40, 10)).toEqual([10, 20, 30]);
  });

  it('puts a tablet banner after every three rows of four', () => {
    expect(adPlaces(40, 12, 12)).toEqual([12, 24, 36]);
  });

  it('never ends a longer list on an ad', () => {
    expect(adPlaces(20, 10)).toEqual([10]);
    expect(adPlaces(11, 10)).toEqual([10]);
  });

  it('gives a short list its one ad after its last story, still near the top', () => {
    expect(adPlaces(10, 10)).toEqual([10]);
    expect(adPlaces(1, 10)).toEqual([1]);
    expect(adPlaces(0, 10)).toEqual([]);
  });

  it('leaves a short list without a grid ad when a banner already sits above it', () => {
    expect(adPlaces(8, 10, 10, false)).toEqual([]);
    expect(adPlaces(20, 10, 10, false)).toEqual([10]);
  });
});
