/**
 * useUndo: offers "Undo" after a quick removal (design books item 14, "Undo": remove from a
 * bookshelf, unfollow, delete a relationship and delete a comment happen at once, with no
 * question, and a note offers Undo for 8 seconds).
 *
 * Who calls it: the four features' components, right after the removal saved. What it calls:
 * UndoProvider's offerUndo(), which shows the note at the bottom of the screen.
 */
import { useContext } from 'react';

import { UndoContext, type UndoContextValue } from './undoContext';

/**
 * Reads the undo note's offer function.
 *
 * @returns offerUndo({ message, undo })
 * Errors: throws when used outside UndoProvider (AppProviders gives it to the whole app).
 */
export function useUndo(): UndoContextValue {
  const value = useContext(UndoContext);
  if (value === null) throw new Error('useUndo must be used inside UndoProvider (AppProviders).');
  return value;
}
