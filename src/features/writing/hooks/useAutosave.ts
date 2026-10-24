/**
 * useAutosave: saves the chapter draft every 10 seconds while there are changes, and at once
 * when the editor loses focus (story S1-E3-02a; board 4.3: "We save every 10 seconds and when
 * you click away from the text"), keeps a copy on the device while anything is unsaved and
 * handles a version conflict (story S1-E3-02b).
 *
 * Who calls it: ChapterEditorPage, which gives it a way to read the current title and body and
 * whether the browser is online (useOnlineStatus, S1-E1-05).
 * What it calls: the zod schema (src/schemas/chapter.ts), then api/chapters.ts →
 * save_chapter_draft(); lib/draftStore.ts keeps and forgets the device copy.
 * The version: the hook keeps the draft_version the last save returned, so the database can
 * tell a save from a stale copy (a conflict). On a conflict saving stops until the writer
 * chooses: keepMine() saves this device's text over the other one, acceptOther() takes the
 * other device's version (the screen loads its text first).
 * States, shown by SaveStatus: idle, unsaved, saving, saved (with the time), offline (kept on
 * this device), conflict, failed, notActive and invalid (the rule that was broken).
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { chapterDraftSchema } from '@/schemas/chapter';

import { saveChapterDraft, type SaveDraftResult } from '../api/chapters';
import { forgetDraftOnDevice } from '../lib/draftStore';

import { useDeviceKeep } from './useDeviceKeep';

/** How often changes are saved while the writer keeps typing (board 4.3). */
export const AUTOSAVE_INTERVAL_MILLISECONDS = 10_000;

/** What the save status can be. */
export type SaveState =
  | { kind: 'idle' }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date; wordCount: number }
  | { kind: 'offline' }
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

/** What the hook needs: the chapter, a way to read the screen and the connection. */
export interface AutosaveOptions {
  chapterCode: string;
  /** The draft_version the text on screen is based on (the server's, or a device copy's). */
  initialVersion: number;
  /** True when the screen opened with unsaved text from the device copy, so it saves soon. */
  startsWithChanges?: boolean;
  /** Reads the current title and body (as Markdown) from the editor. */
  readDraft: () => { title: string; body: string };
  /** False while the browser is offline: nothing is sent, the device copy holds the text. */
  isOnline?: boolean;
}

/** The values the save, the timers and the conflict exits share, held in refs. */
interface AutosaveRefs {
  version: MutableRefObject<number>;
  hasChanges: MutableRefObject<boolean>;
  isSaving: MutableRefObject<boolean>;
  isStopped: MutableRefObject<boolean>;
  isOnline: MutableRefObject<boolean>;
  readDraft: MutableRefObject<() => { title: string; body: string }>;
}

/**
 * Refs, not state: the interval and the blur handler must see the latest values without
 * re-creating themselves on every keystroke.
 *
 * @returns the refs, with isOnline and readDraft kept current on every render
 */
function useAutosaveRefs(options: AutosaveOptions): AutosaveRefs {
  const refs: AutosaveRefs = {
    version: useRef(options.initialVersion),
    hasChanges: useRef(options.startsWithChanges === true),
    isSaving: useRef(false),
    isStopped: useRef(false),
    isOnline: useRef(options.isOnline ?? true),
    readDraft: useRef(options.readDraft),
  };
  refs.isOnline.current = options.isOnline ?? true;
  refs.readDraft.current = options.readDraft;
  return refs;
}

/** What the save and the conflict exits work on, passed as one bundle. */
interface AutosaveContext {
  chapterCode: string;
  refs: AutosaveRefs;
  device: ReturnType<typeof useDeviceKeep>;
  setState: (state: SaveState) => void;
}

/**
 * Applies a save's answer: the new version (and the device copy goes unless the writer typed
 * meanwhile), a conflict (saving stops) or a refusal (the changes stay).
 */
function applyResult({ refs, device, setState }: AutosaveContext, result: SaveDraftResult) {
  if (result.status === 'saved') {
    refs.version.current = result.version;
    if (!refs.hasChanges.current) device.forget();
  }
  if (result.status === 'conflict') refs.isStopped.current = true;
  if (result.status === 'not_active' || result.status === 'not_found')
    refs.hasChanges.current = true;
  setState(stateFor(result));
}

/**
 * Checks what is on screen against the rules (rule 8), or says which rule broke.
 *
 * @returns the checked draft, or null after setting the "invalid" state
 */
function checkedDraft({ refs, setState }: AutosaveContext) {
  const checked = chapterDraftSchema.safeParse({
    ...refs.readDraft.current(),
    expectedVersion: refs.version.current,
  });
  if (checked.success) return checked.data;
  setState({
    kind: 'invalid',
    messageKey: checked.error.issues[0]?.message ?? 'errors.saveFailed',
  });
  return null;
}

/**
 * Builds the save: checks, sends and applies the answer.
 *
 * @returns save(), stable for the chapter
 */
function useSave(context: AutosaveContext) {
  const { chapterCode, refs, device, setState } = context;
  return useCallback(async () => {
    // Step 1: nothing to do while a save is in flight, after a conflict, or with no changes.
    if (refs.isSaving.current || refs.isStopped.current || !refs.hasChanges.current) return;
    // Step 2: offline, nothing is sent; the device copy already holds the text.
    if (!refs.isOnline.current) return setState({ kind: 'offline' });
    // Step 3: the rules (rule 8).
    const draft = checkedDraft(context);
    if (draft === null) return;
    // Step 4: send. Changes made while the save is in flight are kept for the next one.
    refs.isSaving.current = true;
    refs.hasChanges.current = false;
    setState({ kind: 'saving' });
    try {
      applyResult(context, await saveChapterDraft(await requireClient(), chapterCode, draft));
    } catch {
      // No connection, or the database refused: keep the changes and try again next time.
      refs.hasChanges.current = true;
      setState(refs.isOnline.current ? { kind: 'failed' } : { kind: 'offline' });
    } finally {
      refs.isSaving.current = false;
    }
    // The refs and setState never change identity, so only the chapter and the device matter.
  }, [chapterCode, device]);
}

/**
 * The two ways out of a conflict (S1-E3-02b).
 *
 * @returns keepMine (this device's text replaces the other) and acceptOther (the screen loaded
 *   the other one; nothing is left to save)
 */
function useConflictExits(context: AutosaveContext, save: () => Promise<void>) {
  const { chapterCode, refs, device, setState } = context;
  const keepMine = useCallback(
    async (serverVersion: number) => {
      refs.version.current = serverVersion;
      refs.isStopped.current = false;
      refs.hasChanges.current = true;
      await save();
    },
    [refs, save],
  );
  const acceptOther = useCallback(
    (serverVersion: number) => {
      refs.version.current = serverVersion;
      refs.isStopped.current = false;
      refs.hasChanges.current = false;
      device.cancel();
      void forgetDraftOnDevice(chapterCode);
      setState({ kind: 'idle' });
    },
    [chapterCode, device, refs, setState],
  );
  return { keepMine, acceptOther };
}

/**
 * Runs the autosave.
 *
 * @returns state; markChanged (on every edit); saveNow (on blur); isAllSaved (asked before
 *   publishing); keepMine and acceptOther (the two ways out of a conflict)
 */
export function useAutosave(options: AutosaveOptions) {
  const { chapterCode, isOnline = true } = options;
  const [state, setState] = useState<SaveState>(
    options.startsWithChanges === true ? { kind: 'unsaved' } : { kind: 'idle' },
  );
  const refs = useAutosaveRefs(options);
  const device = useDeviceKeep(chapterCode, refs.readDraft, refs.version);
  const context: AutosaveContext = { chapterCode, refs, device, setState };
  const save = useSave(context);
  const exits = useConflictExits(context, save);

  /** Every edit marks the draft as changed and keeps a copy on the device. */
  const markChanged = useCallback(() => {
    refs.hasChanges.current = true;
    device.keepSoon();
    setState((current) => {
      if (current.kind === 'saving' || current.kind === 'conflict') return current;
      return refs.isOnline.current ? { kind: 'unsaved' } : { kind: 'offline' };
    });
    // The refs never change identity.
  }, [device]);

  // The 10-second tick (board 4.3), and a save as soon as the connection comes back.
  useEffect(() => {
    const timer = window.setInterval(() => void save(), AUTOSAVE_INTERVAL_MILLISECONDS);
    return () => window.clearInterval(timer);
  }, [save]);
  useEffect(() => {
    if (isOnline) void save();
  }, [isOnline, save]);

  // Offline with unsaved words: the status says they are kept on this device.
  const shownState: SaveState = !isOnline && state.kind === 'unsaved' ? { kind: 'offline' } : state;
  /** True when the server has everything on screen: no changes waiting, no conflict, no save
   *  in flight. Publishing (S1-E3-03) asks this after saveNow(), so it publishes what was saved. */
  const isAllSaved = useCallback(
    () => !refs.hasChanges.current && !refs.isStopped.current && !refs.isSaving.current,
    // The refs never change identity.
    [],
  );

  return { state: shownState, markChanged, saveNow: save, isAllSaved, ...exits };
}
