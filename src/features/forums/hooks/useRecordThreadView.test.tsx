/**
 * Counting a thread view once per thread per tab session (bundle GAPS-16, part d).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COUNTED_THREADS_KEY, useRecordThreadView } from './useRecordThreadView';

const recordThreadView = vi.fn();
vi.mock('../api/forumViews', () => ({
  recordThreadView: (...args: unknown[]) => recordThreadView(...args),
}));
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: async () => ({}) }));

describe('useRecordThreadView', () => {
  beforeEach(() => {
    recordThreadView.mockReset();
    recordThreadView.mockResolvedValue(true);
    window.sessionStorage.clear();
  });

  it('sends nothing until the thread is on screen', () => {
    renderHook(() => useRecordThreadView(12, false));
    expect(recordThreadView).not.toHaveBeenCalled();
  });

  it('counts a thread once, then not again in the same tab', async () => {
    const first = renderHook(() => useRecordThreadView(12, true));
    await waitFor(() => expect(recordThreadView).toHaveBeenCalledTimes(1));
    expect(recordThreadView.mock.calls[0]?.[1]).toBe(12);
    first.unmount();
    renderHook(() => useRecordThreadView(12, true));
    expect(recordThreadView).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(COUNTED_THREADS_KEY)).toBe('[12]');
  });

  it('counts another thread separately', async () => {
    renderHook(() => useRecordThreadView(12, true));
    renderHook(() => useRecordThreadView(13, true));
    await waitFor(() => expect(recordThreadView).toHaveBeenCalledTimes(2));
  });

  it('still counts once when the browser blocks storage', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderHook(() => useRecordThreadView(12, true));
    await waitFor(() => expect(recordThreadView).toHaveBeenCalledTimes(1));
    getItem.mockRestore();
  });

  it('a failure is only reported to the console; the reader is not interrupted', async () => {
    recordThreadView.mockRejectedValueOnce(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() => useRecordThreadView(12, true));
    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
