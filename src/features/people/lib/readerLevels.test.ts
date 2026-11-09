/**
 * Tests for the reading level ladder and progress (bundle G7a). The database decides the level;
 * these check the screens draw the same thresholds.
 */
import { describe, expect, it } from 'vitest';

import { isReaderLevelReached, progressToNextReaderLevel, readerLevelFrom } from './readerLevels';

describe('reader levels', () => {
  it('a reader with no chapter read is one chapter from New reader', () => {
    expect(progressToNextReaderLevel(null, 0, 0)).toEqual({
      nextLevel: 'new_reader',
      unit: 'chapters',
      have: 0,
      need: 1,
    });
  });

  it('a New reader counts chapters towards Reader', () => {
    expect(progressToNextReaderLevel('new_reader', 17, 2)).toEqual({
      nextLevel: 'reader',
      unit: 'chapters',
      have: 17,
      need: 50,
    });
  });

  it('a Bookworm counts finished stories towards Story devourer', () => {
    expect(progressToNextReaderLevel('bookworm', 300, 17)).toEqual({
      nextLevel: 'story_devourer',
      unit: 'stories',
      have: 17,
      need: 40,
    });
  });

  it('a Story devourer has nothing left to reach', () => {
    expect(progressToNextReaderLevel('story_devourer', 900, 40)).toBeNull();
  });

  it('marks the rungs at and below the current level as reached', () => {
    expect(isReaderLevelReached('reader', 'bookworm')).toBe(true);
    expect(isReaderLevelReached('story_devourer', 'bookworm')).toBe(false);
    expect(isReaderLevelReached('new_reader', null)).toBe(false);
  });

  it('turns only known values into a level', () => {
    expect(readerLevelFrom('bookworm')).toBe('bookworm');
    expect(readerLevelFrom('novelist')).toBeNull();
  });
});
