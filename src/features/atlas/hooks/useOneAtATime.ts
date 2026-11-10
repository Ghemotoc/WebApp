/**
 * useOneAtATime: runs one change at a time for a small form, so a double click on its button
 * saves (or deletes) once (GAPS-2a break test, 10 Nov 2026).
 *
 * Who calls it: AddActForm and EditActForm. What it calls: only the change it is given.
 */
import { useState } from 'react';

/**
 * The guard for one form.
 *
 * @returns isBusy (a change is on its way; the form disables its buttons) and run, which runs
 *   the change and resolves true, or resolves false at once when another change is still running.
 *   Errors: run throws whatever the change throws.
 */
export function useOneAtATime() {
  const [isBusy, setIsBusy] = useState(false);

  /** Runs the change unless one is already running. */
  async function run(change: () => Promise<void>): Promise<boolean> {
    if (isBusy) return false;
    setIsBusy(true);
    try {
      await change();
      return true;
    } finally {
      setIsBusy(false);
    }
  }

  return { isBusy, run };
}
