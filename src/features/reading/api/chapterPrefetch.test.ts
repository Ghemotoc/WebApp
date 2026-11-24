/**
 * The early chapter read the route's loader starts (story S1-E4-01b).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  forgetAnsweredChapter,
  peekAnsweredChapter,
  prefetchChapter,
  takePrefetchedChapter,
} from './chapterPrefetch';

const fetchChapter = vi.fn();
vi.mock('./chapter', () => ({ fetchChapter: (...args: unknown[]) => fetchChapter(...args) }));
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: async () => ({}) }));

describe('prefetchChapter', () => {
  beforeEach(() => {
    fetchChapter.mockReset();
    fetchChapter.mockResolvedValue({ code: 'abcdefgh' });
  });

  it('starts the read at once, and the reader takes it exactly once', async () => {
    prefetchChapter('statia-meteo', 'abcdefgh');
    const started = takePrefetchedChapter('statia-meteo', 'abcdefgh');
    await expect(started).resolves.toEqual({ code: 'abcdefgh' });
    expect(fetchChapter).toHaveBeenCalledTimes(1);
    expect(fetchChapter.mock.calls[0]?.slice(1)).toEqual(['statia-meteo', 'abcdefgh']);
    // Taken: a later visit to the same chapter asks the database again.
    expect(takePrefetchedChapter('statia-meteo', 'abcdefgh')).toBeUndefined();
  });

  it('keeps reads for different chapters apart', () => {
    prefetchChapter('statia-meteo', 'abcdefgh');
    expect(takePrefetchedChapter('statia-meteo', 'ijklmnop')).toBeUndefined();
    expect(takePrefetchedChapter('statia-meteo', 'abcdefgh')).toBeDefined();
  });

  it('a failed read waits, unhandled, for the reader, which shows "couldn’t load"', async () => {
    fetchChapter.mockRejectedValueOnce(new Error('offline'));
    prefetchChapter('statia-meteo', 'abcdefgh');
    await expect(takePrefetchedChapter('statia-meteo', 'abcdefgh')).rejects.toThrow('offline');
  });

  it('once the answer is in, the reader can look at it as often as it draws, until it is used', async () => {
    prefetchChapter('statia-meteo', 'abcdefgh');
    // Still on its way: nothing to look at yet.
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Arrived: every draw finds the same answer.
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toEqual({
      chapter: { code: 'abcdefgh' },
    });
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toEqual({
      chapter: { code: 'abcdefgh' },
    });
    // Used: a later visit asks the database again.
    forgetAnsweredChapter('statia-meteo', 'abcdefgh');
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toBeUndefined();
    expect(takePrefetchedChapter('statia-meteo', 'abcdefgh')).toBeUndefined();
  });

  it('a newer start for the same chapter replaces the older answer', async () => {
    fetchChapter.mockResolvedValueOnce({ code: 'old' }).mockResolvedValueOnce({ code: 'new' });
    prefetchChapter('statia-meteo', 'abcdefgh');
    prefetchChapter('statia-meteo', 'abcdefgh');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toEqual({ chapter: { code: 'new' } });
    forgetAnsweredChapter('statia-meteo', 'abcdefgh');
  });

  it('a failed read leaves nothing to look at, so the reader asks and shows "couldn’t load"', async () => {
    fetchChapter.mockRejectedValueOnce(new Error('offline'));
    prefetchChapter('statia-meteo', 'abcdefgh');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(peekAnsweredChapter('statia-meteo', 'abcdefgh')).toBeUndefined();
    await expect(takePrefetchedChapter('statia-meteo', 'abcdefgh')).rejects.toThrow('offline');
  });
});
