/**
 * useBoardMoves: moving chapters on the board, with the question first when readers would see a
 * new order (story S1-E17-19; as Manage chapters does, S1-E3-04).
 *
 * A move goes straight to the database. When the database answers that published chapters would
 * change order, nothing has moved yet: the move waits as `pendingMove` until the writer confirms
 * (it is sent again, confirmed) or keeps the order. A failed move says so plainly.
 * Who calls it: ChapterBoard. What it calls: lib/boardColumns.ts for the new order and
 * api/storyline.ts → place_chapter_on_board(); then the refresh it is given.
 */
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { placeChapterOnBoard, type BoardMove, type Storyline } from '../api/storyline';
import { orderAfterMove, type BoardTarget } from '../lib/boardColumns';

/**
 * Follows the board's moves.
 *
 * @param storyline - the storyline the board shows
 * @param refresh - reads the storyline again after a move
 * @returns move (a chapter to a column and place), pendingMove (waiting for the question),
 *   confirm, cancel and failed (true after a move didn't save)
 */
export function useBoardMoves(storyline: Storyline, refresh: () => Promise<void>) {
  const [pendingMove, setPendingMove] = useState<BoardMove | null>(null);
  const [failed, setFailed] = useState(false);

  /** Sends one move; keeps it waiting when the writer has to agree first. */
  async function send(boardMove: BoardMove, isConfirmed: boolean): Promise<void> {
    setFailed(false);
    try {
      const outcome = await placeChapterOnBoard(await requireClient(), boardMove, isConfirmed);
      if (outcome === 'needs_confirmation') {
        setPendingMove(boardMove);
        return;
      }
      setPendingMove(null);
      await refresh();
    } catch {
      // The board may be out of date: say so and read it again.
      setPendingMove(null);
      setFailed(true);
      await refresh();
    }
  }

  return {
    pendingMove,
    failed,
    move: async (chapterCode: string, target: BoardTarget) => {
      const order = orderAfterMove(storyline.chapters, storyline.acts, chapterCode, target);
      await send({ chapterCode, actId: target.actId, order }, false);
    },
    confirm: async () => {
      if (pendingMove !== null) await send(pendingMove, true);
    },
    cancel: () => setPendingMove(null),
  };
}
