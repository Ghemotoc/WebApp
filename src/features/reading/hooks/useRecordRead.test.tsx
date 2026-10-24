/**
 * Counting a read once per chapter per tab session (story S1-E4-01a).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COUNTED_CHAPTERS_KEY, useRecordRead } from './useRecordRead';

const recordChapterRead = vi.fn();
vi.mock('../api/chapter', () => ({
  recordChapterRead: (...args: unknown[]) => recordChapterRead(...args),
}));
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: async () => ({}) }));

describe('useRecordRead', () => {
  beforeEach(() => {
    recordChapterRead.mockReset();
    recordChapterRead.mockResolvedValue(true);
    window.sessionStorage.clear();
  });

  it('sends nothing until the text is on screen', () => {
    renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', false));
    expect(recordChapterRead).not.toHaveBeenCalled();
  });

  it('counts a chapter once, then not again in the same tab', async () => {
    const first = renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', true));
    await waitFor(() => expect(recordChapterRead).toHaveBeenCalledTimes(1));
    expect(recordChapterRead.mock.calls[0]?.slice(1)).toEqual(['statia-meteo', 'abcdefgh']);
    first.unmount();
    renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', true));
    expect(recordChapterRead).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(COUNTED_CHAPTERS_KEY)).toBe('["abcdefgh"]');
  });

  it('counts another chapter separately', async () => {
    renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', true));
    renderHook(() => useRecordRead('statia-meteo', 'ijklmnop', true));
    await waitFor(() => expect(recordChapterRead).toHaveBeenCalledTimes(2));
  });

  it('still counts once when the browser blocks storage', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', true));
    await waitFor(() => expect(recordChapterRead).toHaveBeenCalledTimes(1));
    getItem.mockRestore();
  });

  it('a failure is only reported to the console; the reader is not interrupted', async () => {
    recordChapterRead.mockRejectedValueOnce(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() => useRecordRead('statia-meteo', 'abcdefgh', true));
    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
