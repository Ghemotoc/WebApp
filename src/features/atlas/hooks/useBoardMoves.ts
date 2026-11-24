/**
 * useBoardMoves: moving chapters on the board, with the question first when readers would see a
 * new order (story S1-E17-19; as Manage chapters does, S1-E3-04).
 *
 * A move shows on the board at once (design books item 13: a drag answers within 100 ms) and goes
 * to the database. When the database answers that published chapters would change order, the
 * card goes back, because nothing has moved yet: the move waits as `pendingMove` until the writer
 * confirms (it shows again and is sent, confirmed) or keeps the order. A failed move puts the
 * card back and says so plainly.
 * Who calls it: ChapterBoard. What it calls: lib/boardColumns.ts for the new order and
 * api/storyline.ts → place_chapter_on_board(); then the refresh it is given.
 */
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { placeChapterOnBoard, type BoardMove, type Storyline } from '../api/storyline';
import { chaptersAfterMove, orderAfterMove, type BoardTarget } from '../lib/boardColumns';

/**
 * Follows the board's moves.
 *
 * @param storyline - the storyline the board shows
 * @param refresh - reads the storyline again after a move
 * @returns shownStoryline (the storyline with the move in flight drawn in), move (a chapter to a
 *   column and place), pendingMove (waiting for the question), confirm, cancel and failed (true
 *   after a move didn't save)
 */
export function useBoardMoves(storyline: Storyline, refresh: () => Promise<void>) {
  const [pendingMove, setPendingMove] = useState<BoardMove | null>(null);
  const [failed, setFailed] = useState(false);
  // The move on its way to the database, drawn on the board until the fresh storyline arrives.
  const [shownMove, setShownMove] = useState<BoardMove | null>(null);
  const shownStoryline: Storyline =
    shownMove === null
      ? storyline
      : { ...storyline, chapters: chaptersAfterMove(storyline.chapters, shownMove) };

  /** Sends one move; keeps it waiting when the writer has to agree first. */
  async function send(boardMove: BoardMove, isConfirmed: boolean): Promise<void> {
    // Step 1: the card lands at once.
    setFailed(false);
    setShownMove(boardMove);
    try {
      const outcome = await placeChapterOnBoard(await requireClient(), boardMove, isConfirmed);
      if (outcome === 'needs_confirmation') {
        // Step 2a: nothing moved yet, so the card goes back while the question is asked.
        setShownMove(null);
        setPendingMove(boardMove);
        return;
      }
      // Step 2b: saved; the fresh storyline replaces the drawn move.
      setPendingMove(null);
      await refresh();
      setShownMove(null);
    } catch {
      // Step 2c: the card goes back, the note says so and the board reads again.
      setShownMove(null);
      setPendingMove(null);
      setFailed(true);
      await refresh();
    }
  }

  return {
    shownStoryline,
    pendingMove,
    failed,
    move: async (chapterCode: string, target: BoardTarget) => {
      const order = orderAfterMove(
        shownStoryline.chapters,
        shownStoryline.acts,
        chapterCode,
        target,
      );
      await send({ chapterCode, actId: target.actId, order }, false);
    },
    confirm: async () => {
      if (pendingMove !== null) await send(pendingMove, true);
    },
    cancel: () => setPendingMove(null),
  };
}
