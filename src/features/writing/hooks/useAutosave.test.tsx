/**
 * The autosave: every 10 seconds while there are changes, at once on demand, stopping on a
 * conflict (story S1-E3-02a); the device copy, offline and the two ways out of a conflict
 * (story S1-E3-02b).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTOSAVE_INTERVAL_MILLISECONDS, useAutosave } from './useAutosave';
import { DEVICE_KEEP_DELAY_MILLISECONDS } from './useDeviceKeep';

const saveChapterDraft = vi.fn();
vi.mock('../api/chapters', () => ({
  saveChapterDraft: (...args: unknown[]) => saveChapterDraft(...args),
}));
vi.mock('@/features/account/hooks/useMyNames', () => ({ requireClient: async () => ({}) }));
const keepDraftOnDevice = vi.fn();
const forgetDraftOnDevice = vi.fn();
vi.mock('../lib/draftStore', () => ({
  keepDraftOnDevice: (...args: unknown[]) => keepDraftOnDevice(...args),
  forgetDraftOnDevice: (...args: unknown[]) => forgetDraftOnDevice(...args),
}));

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
    keepDraftOnDevice.mockReset();
    forgetDraftOnDevice.mockReset();
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

  it('says "Unsaved changes" when the writer typed while a save was in flight', async () => {
    // The save answers only when the test lets it, so typing can happen in between.
    let finishSave: (result: unknown) => void = () => undefined;
    saveChapterDraft.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    let saving: Promise<void> = Promise.resolve();
    act(() => {
      saving = hook.result.current.saveNow();
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.state.kind).toBe('saving');
    // The writer types more while the first save is on its way.
    act(() => hook.result.current.markChanged());
    await act(async () => {
      finishSave({ status: 'saved', version: 2, savedAt: '2026-10-23T10:00:00Z', wordCount: 1 });
      await saving;
    });
    // The newer words are not saved yet, so the status doesn't claim they are.
    expect(hook.result.current.state.kind).toBe('unsaved');
    expect(hook.result.current.isAllSaved()).toBe(false);
    expect(forgetDraftOnDevice).not.toHaveBeenCalled();
    // The next save sends them, from the version the first save gave.
    await act(() => hook.result.current.saveNow());
    expect(saveChapterDraft.mock.calls[1]?.[2]).toMatchObject({ expectedVersion: 2 });
    expect(hook.result.current.state.kind).toBe('saved');
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

  it('keeps a copy on the device half a second after typing, and forgets it once saved', async () => {
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    expect(keepDraftOnDevice).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(DEVICE_KEEP_DELAY_MILLISECONDS));
    expect(keepDraftOnDevice).toHaveBeenCalledWith({
      code: 'abcdefgh',
      title: 'Capitolul unu',
      body: 'Text',
      baseVersion: 1,
    });
    await act(() => hook.result.current.saveNow());
    expect(forgetDraftOnDevice).toHaveBeenCalledWith('abcdefgh');
  });

  it('offline: says the words are kept on this device, sends nothing, and saves on reconnect', async () => {
    const draft = { title: 'Capitolul unu', body: 'Text' };
    const hook = renderHook(
      ({ isOnline }: { isOnline: boolean }) =>
        useAutosave({
          chapterCode: 'abcdefgh',
          initialVersion: 1,
          readDraft: () => draft,
          isOnline,
        }),
      { initialProps: { isOnline: false } },
    );
    act(() => hook.result.current.markChanged());
    expect(hook.result.current.state.kind).toBe('offline');
    await act(() => hook.result.current.saveNow());
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS));
    expect(saveChapterDraft).not.toHaveBeenCalled();
    hook.rerender({ isOnline: true });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveChapterDraft).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.kind).toBe('saved');
  });

  it('sends the device copy as soon as the editor opens online', async () => {
    const draft = { title: 'Din dispozitiv', body: 'Text' };
    renderHook(() =>
      useAutosave({
        chapterCode: 'abcdefgh',
        initialVersion: 3,
        startsWithChanges: true,
        readDraft: () => draft,
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveChapterDraft.mock.calls[0]?.[2]).toMatchObject({
      title: 'Din dispozitiv',
      expectedVersion: 3,
    });
  });

  it('"Keep this version" saves this device\'s text over the server\'s version', async () => {
    saveChapterDraft.mockResolvedValueOnce({ status: 'conflict', version: 5, savedAt: null });
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    await act(() => hook.result.current.keepMine(5));
    expect(saveChapterDraft.mock.calls[1]?.[2]).toMatchObject({ expectedVersion: 5 });
    expect(hook.result.current.state.kind).toBe('saved');
  });

  it('"Keep the other version" stops saving this device\'s text and forgets its copy', async () => {
    saveChapterDraft.mockResolvedValueOnce({ status: 'conflict', version: 5, savedAt: null });
    const { hook } = renderAutosave();
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    act(() => hook.result.current.acceptOther(5));
    expect(hook.result.current.state.kind).toBe('idle');
    expect(forgetDraftOnDevice).toHaveBeenCalledWith('abcdefgh');
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MILLISECONDS * 2));
    expect(saveChapterDraft).toHaveBeenCalledTimes(1);
    // The next edit saves against the other device's version.
    act(() => hook.result.current.markChanged());
    await act(() => hook.result.current.saveNow());
    expect(saveChapterDraft.mock.calls[1]?.[2]).toMatchObject({ expectedVersion: 5 });
  });
});
