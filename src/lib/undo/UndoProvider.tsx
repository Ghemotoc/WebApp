/**
 * UndoProvider: holds the one "Removed. Undo" note the app shows at a time (design books item
 * 14, "Undo").
 *
 * How it works: a feature calls offerUndo() after a removal saved. The note shows for 8 seconds
 * (UNDO_SECONDS) at the bottom of the screen; a newer offer replaces an older one. Pressing Undo
 * runs the offer's undo(); if that fails, the note says it couldn't be undone. While the pointer
 * is over the note or the focus is in it, the 8 seconds wait (WCAG 2.2.1, timing adjustable).
 * Who uses it: AppProviders, around the whole app. What it calls: UndoNote to draw the note.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { UndoNote } from '@/components/ui/UndoNote';

import { UndoContext, type UndoOffer } from './undoContext';

/** How long the note offers Undo (design books item 14: 8 seconds). */
export const UNDO_SECONDS = 8;

/** The note on screen: the offer, a number so a new offer restarts the timer, and its state. */
interface ShownNote {
  offer: UndoOffer;
  key: number;
  state: 'offering' | 'undoing' | 'failed';
}

/**
 * Gives the app offerUndo() and draws the note.
 *
 * @param props.children - the app
 * @returns the app with the note under it
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<ShownNote | null>(null);

  // Step 1: a new offer replaces whatever note was there.
  const offerUndo = useCallback((offer: UndoOffer) => {
    setShown((current) => ({ offer, key: (current?.key ?? 0) + 1, state: 'offering' }));
  }, []);

  // Step 2: Undo runs the offer's undo(); the note goes on success and says so on failure.
  const runUndo = useCallback(async () => {
    if (shown === null) return;
    const key = shown.key;
    setShown({ ...shown, state: 'undoing' });
    try {
      await shown.offer.undo();
      setShown((current) => (current?.key === key ? null : current));
    } catch {
      setShown((current) => (current?.key === key ? { ...current, state: 'failed' } : current));
    }
  }, [shown]);

  const value = useMemo(() => ({ offerUndo }), [offerUndo]);
  return (
    <UndoContext.Provider value={value}>
      {children}
      <UndoNote
        key={shown?.key ?? 0}
        message={shown?.offer.message ?? null}
        state={shown?.state ?? 'offering'}
        seconds={UNDO_SECONDS}
        onUndo={() => void runUndo()}
        onDone={() => setShown(null)}
      />
    </UndoContext.Provider>
  );
}
