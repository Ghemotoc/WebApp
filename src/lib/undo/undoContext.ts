/**
 * undoContext: the shared "Removed. Undo" note's context (design books item 14, "Undo").
 *
 * Who uses it: UndoProvider (gives it) and useUndo (reads it). Kept in its own file so the
 * provider file only exports a component (React Fast Refresh).
 */
import { createContext } from 'react';

/** One offer to undo: what happened, in words, and how to put it back. */
export interface UndoOffer {
  /** What just happened, already translated ("Comment deleted."). */
  message: string;
  /** Puts it back; throws when it can't, and the note then says so. */
  undo: () => Promise<void>;
}

/** What the context carries: one function that shows the note. */
export interface UndoContextValue {
  offerUndo: (offer: UndoOffer) => void;
}

/** null outside UndoProvider, so useUndo can say plainly that it was used in the wrong place. */
export const UndoContext = createContext<UndoContextValue | null>(null);
