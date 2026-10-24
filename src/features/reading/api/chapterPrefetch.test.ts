/**
 * The early chapter read the route's loader starts (story S1-E4-01b).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prefetchChapter, takePrefetchedChapter } from './chapterPrefetch';

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
});
