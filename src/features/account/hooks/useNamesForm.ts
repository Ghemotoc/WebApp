/**
 * useNamesForm: the answers and the save step shared by the setup form and the Settings account
 * section (story S1-E2-04).
 *
 * Who calls it: SetupForm (both names in one save) and AccountNamesSection (each name on its own).
 * What it calls: useMyNames's save mutations (set_my_handle() and set_my_pen_name()).
 * What it keeps: the typed names, what the last save answered for each, and whether saving failed
 * because the database couldn't be reached.
 */
import { useState } from 'react';

import { quickHandleProblem, type HandleOutcome, type PenNameOutcome } from '../lib/nameRules';

import { useMyNames } from './useMyNames';

/** The form's state and actions. */
export interface NamesForm {
  handle: string;
  penName: string;
  setHandle: (value: string) => void;
  setPenName: (value: string) => void;
  handleOutcome: HandleOutcome | null;
  penNameOutcome: PenNameOutcome | null;
  saveFailed: boolean;
  isSaving: boolean;
  /** Saves the username; resolves true when it was saved (or unchanged). */
  saveHandle: () => Promise<boolean>;
  /** Saves the pen name; resolves true when it was saved (or unchanged). */
  savePenName: () => Promise<boolean>;
}

/**
 * Holds the names being edited.
 *
 * @param account - useMyNames's result, so the caller and the form share one cache
 * @param startingNames - what the fields start with
 * @returns the form's state and actions
 */
export function useNamesForm(
  account: ReturnType<typeof useMyNames>,
  startingNames: { handle: string; penName: string },
): NamesForm {
  const [handle, setHandleValue] = useState(startingNames.handle);
  const [penName, setPenNameValue] = useState(startingNames.penName);
  const [handleOutcome, setHandleOutcome] = useState<HandleOutcome | null>(null);
  const [penNameOutcome, setPenNameOutcome] = useState<PenNameOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  /** Saves the username after the quick rules; any refusal stays on screen under the field. */
  async function saveHandle(): Promise<boolean> {
    setSaveFailed(false);
    // The quick rules show live already; don't send a name that breaks them.
    if (quickHandleProblem(handle) !== null) return false;
    try {
      const outcome = await account.handleSave.mutateAsync(handle);
      setHandleOutcome(outcome === 'ok' ? null : outcome);
      return outcome === 'ok';
    } catch {
      setSaveFailed(true);
      return false;
    }
  }

  /** Saves the pen name; any refusal stays on screen under the field. */
  async function savePenName(): Promise<boolean> {
    setSaveFailed(false);
    try {
      const outcome = await account.penNameSave.mutateAsync(penName);
      setPenNameOutcome(outcome === 'ok' ? null : outcome);
      return outcome === 'ok';
    } catch {
      setSaveFailed(true);
      return false;
    }
  }

  return {
    handle,
    penName,
    // Typing again clears the last save's refusal, so the live check takes over.
    setHandle: (value) => {
      setHandleValue(value);
      setHandleOutcome(null);
    },
    setPenName: (value) => {
      setPenNameValue(value);
      setPenNameOutcome(null);
    },
    handleOutcome,
    penNameOutcome,
    saveFailed,
    isSaving: account.handleSave.isPending || account.penNameSave.isPending,
    saveHandle,
    savePenName,
  };
}
