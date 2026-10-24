/**
 * useDeviceKeep: writes the chapter draft to the device a moment after each change, so a lost
 * connection, a closed tab or a crash never loses words (story S1-E3-02b).
 *
 * Who calls it: useAutosave. What it calls: lib/draftStore.ts (IndexedDB).
 * Why a short wait: a chapter can be 100,000 characters; writing it on every keystroke would be
 * wasteful, so the copy is written once typing pauses for half a second.
 */
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

import { forgetDraftOnDevice, keepDraftOnDevice } from '../lib/draftStore';

/** How long typing must pause before the copy is written. */
export const DEVICE_KEEP_DELAY_MILLISECONDS = 500;

/**
 * Keeps the device copy up to date.
 *
 * @param chapterCode - the chapter's code (the store's key)
 * @param readDraftRef - reads the title and body on screen
 * @param versionRef - the server version the text is based on
 * @returns keepSoon (after a change), forget (after a save), cancel (drop a pending write)
 */
export function useDeviceKeep(
  chapterCode: string,
  readDraftRef: RefObject<() => { title: string; body: string }>,
  versionRef: RefObject<number>,
) {
  const timerRef = useRef<number | null>(null);

  /** Drops a write that hasn't happened yet. */
  const cancel = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  /** Writes the copy once typing pauses. */
  const keepSoon = useCallback(() => {
    cancel();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void keepDraftOnDevice({
        code: chapterCode,
        ...readDraftRef.current(),
        baseVersion: versionRef.current,
      });
    }, DEVICE_KEEP_DELAY_MILLISECONDS);
  }, [cancel, chapterCode, readDraftRef, versionRef]);

  /** The server has the text: the copy goes, and so does any write still waiting. */
  const forget = useCallback(() => {
    cancel();
    void forgetDraftOnDevice(chapterCode);
  }, [cancel, chapterCode]);

  // A write still waiting when the page closes would be lost; write it at once instead.
  useEffect(
    () => () => {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      void keepDraftOnDevice({
        code: chapterCode,
        ...readDraftRef.current(),
        baseVersion: versionRef.current,
      });
    },
    [chapterCode, readDraftRef, versionRef],
  );

  return useMemo(() => ({ keepSoon, forget, cancel }), [keepSoon, forget, cancel]);
}
