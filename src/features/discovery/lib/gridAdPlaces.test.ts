/**
 * Tests for gridAdPlaces (bundle G7e): where the ads go in a long grid of stories.
 */
import { describe, expect, it } from 'vitest';

import { isAdAfterStory } from './gridAdPlaces';

/** The story numbers an ad follows in a grid of this many stories. */
function adPlaces(storyCount: number, firstAdAfter: number): number[] {
  const places: number[] = [];
  for (let storyNumber = 1; storyNumber <= storyCount; storyNumber += 1) {
    if (isAdAfterStory(storyNumber, storyCount, firstAdAfter)) places.push(storyNumber);
  }
  return places;
}

describe('ads in a long grid of stories', () => {
  it('puts the first ad high, after the 4th story, then one after every 10 more', () => {
    expect(adPlaces(48, 4)).toEqual([4, 14, 24, 34, 44]);
  });

  it('brings more ads in among the new stories each time more are shown', () => {
    expect(adPlaces(24, 4)).toEqual([4, 14]);
    expect(adPlaces(48, 4)).toEqual([4, 14, 24, 34, 44]);
  });

  it('puts an ad after every 10 stories when the first follows the 10th', () => {
    expect(adPlaces(35, 10)).toEqual([10, 20, 30]);
  });

  it('never ends a list on an ad', () => {
    expect(adPlaces(14, 4)).toEqual([4]);
    expect(adPlaces(20, 10)).toEqual([10]);
  });

  it('shows no ad in a list too short to have one', () => {
    expect(adPlaces(4, 4)).toEqual([]);
    expect(adPlaces(3, 4)).toEqual([]);
    expect(adPlaces(0, 4)).toEqual([]);
  });
});
