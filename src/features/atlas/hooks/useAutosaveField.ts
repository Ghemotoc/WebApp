/**
 * useAutosaveField: one field that saves by itself after the writer pauses (Story Atlas
 * principle: "Every change saves by itself. There is no Save button to forget"; non-functional
 * requirement: "changes save within about a second; a failed save says so in plain words and
 * keeps the text").
 *
 * Who calls it: PlanTextField and PlanSelectField. What it calls: the save function it is given
 * (useStoryPlan's savePlan or saveStory).
 * How it works: the field keeps the typed value itself. Each change starts a short wait; when the
 * wait ends (or the field loses focus) the value is saved. A failed save keeps the typed value and
 * says so; the next change tries again.
 */
import { useEffect, useRef, useState } from 'react';

/** The pause after the last change before saving: within "about a second" of typing. */
export const autosaveDelayMilliseconds = 800;

/** Where the field's save is: nothing to save, waiting or saving, saved, failed, or refused. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'invalid';

/** What the hook needs. */
export interface AutosaveFieldOptions<Value> {
  /** The saved value, as last read from the database. */
  savedValue: Value;
  /** Saves a new value; throws when it can't. */
  save: (value: Value) => Promise<void>;
  /** Says whether a value may be saved; an invalid one waits with the status 'invalid'. */
  isValid?: (value: Value) => boolean;
}

/**
 * Keeps one field and saves it after a pause.
 *
 * @returns value (what the field shows), change (call on every edit), flush (call on blur: saves
 *   at once if a change is waiting) and status
 */
export function useAutosaveField<Value>({
  savedValue,
  save,
  isValid,
}: AutosaveFieldOptions<Value>) {
  const [value, setValue] = useState<Value>(savedValue);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const waitingValue = useRef<{ value: Value } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSave = useRef(save);
  latestSave.current = save;

  // When the saved value changes from outside (a refetch) and nothing is waiting, show it.
  useEffect(() => {
    if (waitingValue.current === null) setValue(savedValue);
  }, [savedValue]);

  // Leaving the page saves what is waiting, so nothing typed is lost. The ref always holds the
  // latest saveWaiting, so the clean-up that runs on leaving calls the current one.
  const saveWaitingOnLeave = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    const onLeave = saveWaitingOnLeave;
    return () => void onLeave.current();
  }, []);

  /** Saves the waiting value, if any, and reports how it went. */
  async function saveWaiting() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const waiting = waitingValue.current;
    if (waiting === null) return;
    waitingValue.current = null;
    setStatus('saving');
    try {
      await latestSave.current(waiting.value);
      setStatus('saved');
    } catch {
      // Keep the text on screen and say so; the next change tries again.
      setStatus('failed');
    }
  }

  saveWaitingOnLeave.current = saveWaiting;

  /** Takes a new value and starts the wait before saving it. */
  function change(nextValue: Value) {
    setValue(nextValue);
    if (timer.current !== null) clearTimeout(timer.current);
    // A value the rules refuse is shown but never sent.
    if (isValid !== undefined && !isValid(nextValue)) {
      waitingValue.current = null;
      setStatus('invalid');
      return;
    }
    waitingValue.current = { value: nextValue };
    setStatus('idle');
    timer.current = setTimeout(() => void saveWaiting(), autosaveDelayMilliseconds);
  }

  return { value, change, flush: saveWaiting, status };
}
