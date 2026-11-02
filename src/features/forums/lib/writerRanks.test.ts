/**
 * Tests for writerRanks (story S1-E8-09): the ladder, the sticker per rank and the progress bar.
 */
import { describe, expect, it } from 'vitest';

import { isRankReached, progressToNextRank, rankFrom, stickerFor } from './writerRanks';

describe('writer ranks', () => {
  it('a New writer counts chapters towards Writer', () => {
    expect(progressToNextRank('new_writer', 3, 900)).toEqual({
      nextRank: 'writer',
      unit: 'chapters',
      have: 3,
      need: 5,
    });
  });

  it('a Writer sees whichever route to Storyteller is closer', () => {
    expect(progressToNextRank('writer', 6, 25000)?.unit).toBe('words');
    expect(progressToNextRank('writer', 12, 4000)?.unit).toBe('chapters');
  });

  it('a Storyteller counts words towards Novelist', () => {
    expect(progressToNextRank('storyteller', 40, 41200)).toEqual({
      nextRank: 'novelist',
      unit: 'words',
      have: 41200,
      need: 100000,
    });
  });

  it('a Novelist has no next rank', () => {
    expect(progressToNextRank('novelist', 80, 120000)).toBeNull();
  });

  it('each rank has its own sticker', () => {
    const stickers = new Set(
      (['new_writer', 'writer', 'storyteller', 'novelist'] as const).map(stickerFor),
    );
    expect(stickers.size).toBe(4);
  });

  it('a rung is reached when it is at or below the writer’s rank', () => {
    expect(isRankReached('writer', 'storyteller')).toBe(true);
    expect(isRankReached('storyteller', 'storyteller')).toBe(true);
    expect(isRankReached('novelist', 'storyteller')).toBe(false);
  });

  it('anything that is not a rank reads as no rank', () => {
    expect(rankFrom('storyteller')).toBe('storyteller');
    expect(rankFrom('wizard')).toBeNull();
    expect(rankFrom(null)).toBeNull();
  });
});
