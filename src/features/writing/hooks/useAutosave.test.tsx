/**
 * The autosave: every 10 seconds while there are changes, at once on demand, stopping on a
 * conflict (story S1-E3-02a).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTOSAVE_INTERVAL_MILLISECONDS, useAutosave } from './useAutosave';

const saveChapterDraft = vi.fn();
vi.mock('../api/chapters', () => ({
  saveChapterDraft: (...args: unknown[]) => saveChapterDraft(...args),
}));
vi.mock('@/features/account/hooks/useMyNames', () => ({ requireClient: async () => ({}) }));

/** Runs the hook with a draft the tests can change. */
function renderAutosave() {
  const draft = { title: 'Capitolul unu', body: 'Text' };
  const hook = renderHook(() =>
    useAutosave({ chapterCode: 'abcdefgh', initialVersion: 1, readDraft: () => draft }),
  );
  return { hook, draft };
}

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveChapterDraft.mockReset();
    saveChapterDraft.mockResolvedValue({
      status: 'saved',
      version: 2,
      savedAt: '2026-10-23T10:00:00Z',
      wordCount: 1,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('starts idle and saves nothing while nothing changed', async () => {
    const { hook } = renderAutosave();
    expect(hook.result.current.state.kind).toBe('idle');
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS * 2));
    expect(saveChapterDraft).not.toHaveBeenCalled();
  });

  it('saves a change on the next 10-second tick with the version it started from', async () => {
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    expect(hook.result.current.state.kind).toBe('unsaved');
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS));
    expect(saveChapterDraft).toHaveBeenCalledTimes(1);
    expect(saveChapterDraft.mock.calls[0]?.[2]).toEqual({
      title: 'Capitolul unu',
      body: 'Text',
      expectedVersion: 1,
    });
    expect(hook.result.current.state).toMatchObject({ kind: 'saved', wordCount: 1 });
  });

  it('saves at once on saveNow (the blur) and then sends the new version', async () => {
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(saveChapterDraft).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(saveChapterDraft.mock.calls[1]?.[2]).toMatchObject({ expectedVersion: 2 });
  });

  it('stops after a conflict so nothing is overwritten', async () => {
    saveChapterDraft.mockResolvedValue({ status: 'conflict', version: 5, savedAt: null });
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(hook.result.current.state).toEqual({ kind: 'conflict', serverVersion: 5 });
    act(() => hook.result.current.markChanged());
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS * 3));
    expect(saveChapterDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps the changes and reports a failure when the save throws, then retries', async () => {
    saveChapterDraft.mockRejectedValueOnce(new Error('offline'));
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(hook.result.current.state.kind).toBe('failed');
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS));
    expect(saveChapterDraft).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.kind).toBe('saved');
  });

  it('refuses a draft that breaks a rule before asking the database', async () => {
    const { hook, draft } = renderAutosave();
    draft.body = 'x <script>alert(1)</script>';
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(saveChapterDraft).not.toHaveBeenCalled();
    expect(hook.result.current.state).toEqual({
      kind: 'invalid',
      messageKey: 'errors.htmlNotAllowed',
    });
  });
});
