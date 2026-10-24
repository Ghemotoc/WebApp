/**
 * useAutosave: saves the chapter draft every 10 seconds while there are changes, and at once
 * when the editor loses focus (story S1-E3-02a; board 4.3: "We save every 10 seconds and when
 * you click away from the text").
 *
 * Who calls it: ChapterEditorPage, which gives it a way to read the current title and body.
 * What it calls: the zod schema (src/schemas/chapter.ts), then api/chapters.ts →
 * save_chapter_draft(). It keeps the draft version the last save returned, so the database
 * can tell a save from a stale copy apart (a conflict; S1-E3-02b shows it and offers to keep
 * or compare; here the status says so and saving stops).
 * States, shown by SaveStatus: idle, unsaved, saving, saved (with the time), conflict, failed
 * (no connection or the database refused), notActive (the account may not write yet) and
 * invalid (the text broke a rule, with the message key).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { chapterDraftSchema } from '@/schemas/chapter';

import { saveChapterDraft, type SaveDraftResult } from '../api/chapters';

/** How often changes are saved while the writer keeps typing (board 4.3). */
export const AUTOSAVE_INTERVAL_MILLISECONDS = 10_000;

/** What the save status can be. */
export type SaveState =
  | { kind: 'idle' }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date; wordCount: number }
  | { kind: 'conflict'; serverVersion: number }
  | { kind: 'failed' }
  | { kind: 'notActive' }
  | { kind: 'invalid'; messageKey: string };

/**
 * The status to show for a save's answer.
 *
 * @param result - what save_chapter_draft() answered
 * @returns the state
 */
function stateFor(result: SaveDraftResult): SaveState {
  if (result.status === 'saved') {
    return { kind: 'saved', at: new Date(result.savedAt), wordCount: result.wordCount };
  }
  if (result.status === 'conflict') return { kind: 'conflict', serverVersion: result.version };
  if (result.status === 'not_active') return { kind: 'notActive' };
  return { kind: 'failed' };
}

/** What the hook needs: the chapter and a way to read what is on screen right now. */
export interface AutosaveOptions {
  chapterCode: string;
  /** The draft_version the chapter was loaded with. */
  initialVersion: number;
  /** Reads the current title and body (as Markdown) from the editor. */
  readDraft: () => { title: string; body: string };
}

/**
 * Runs the autosave.
 *
 * @returns state, markChanged (call on every edit), saveNow (call on blur), and version
 */
export function useAutosave({ chapterCode, initialVersion, readDraft }: AutosaveOptions) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  // Refs, not state: the interval and the blur handler must see the latest values without
  // re-creating themselves on every keystroke.
  const versionRef = useRef(initialVersion);
  const hasChangesRef = useRef(false);
  const isSavingRef = useRef(false);
  const isStoppedRef = useRef(false);
  const readDraftRef = useRef(readDraft);
  readDraftRef.current = readDraft;

  /** Applies a save's answer: the new version, a conflict (saving stops) or a refusal. */
  function applyResult(result: SaveDraftResult) {
    if (result.status === 'saved') versionRef.current = result.version;
    if (result.status === 'conflict') isStoppedRef.current = true;
    if (result.status === 'not_active' || result.status === 'not_found') {
      hasChangesRef.current = true;
    }
    setState(stateFor(result));
  }

  /** Sends what is on screen; called by the interval and by saveNow(). */
  const save = useCallback(async () => {
    // Step 1: nothing to do while a save is in flight, after a conflict, or with no changes.
    if (isSavingRef.current || isStoppedRef.current || !hasChangesRef.current) return;
    // Step 2: the rules (rule 8); a broken rule stops the save and says which rule.
    const checked = chapterDraftSchema.safeParse({
      ...readDraftRef.current(),
      expectedVersion: versionRef.current,
    });
    if (!checked.success) {
      const messageKey = checked.error.issues[0]?.message ?? 'errors.saveFailed';
      setState({ kind: 'invalid', messageKey });
      return;
    }
    // Step 3: send. Changes made while the save is in flight are kept for the next one.
    isSavingRef.current = true;
    hasChangesRef.current = false;
    setState({ kind: 'saving' });
    try {
      applyResult(await saveChapterDraft(await requireClient(), chapterCode, checked.data));
    } catch {
      // No connection, or the database refused: keep the changes and try again next time.
      hasChangesRef.current = true;
      setState({ kind: 'failed' });
    } finally {
      isSavingRef.current = false;
    }
    // applyResult reads refs only, so it never goes stale.
  }, [chapterCode]);

  /** Every edit marks the draft as changed; the status shows "Unsaved changes". */
  const markChanged = useCallback(() => {
    hasChangesRef.current = true;
    setState((current) =>
      current.kind === 'saving' || current.kind === 'conflict' ? current : { kind: 'unsaved' },
    );
  }, []);

  // The 10-second tick (board 4.3).
  useEffect(() => {
    const timer = window.setInterval(() => void save(), AUTOSAVE_INTERVAL_MILLISECONDS);
    return () => window.clearInterval(timer);
  }, [save]);

  return { state, markChanged, saveNow: save };
}
