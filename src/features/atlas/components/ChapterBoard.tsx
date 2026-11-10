/**
 * ChapterBoard: the chapters as cards in act columns (story S1-E17-19).
 *
 * One column per act, then "No act"; on a phone the columns stack. A move (drag or buttons)
 * saves at once and the chapter numbers follow; a move that would renumber published chapters
 * asks first (BoardMoveDialog). After a move, focus goes back to the moved card, so a keyboard
 * user can keep moving it.
 * Who uses it: StorylinePage. What it calls: useBoardMoves, lib/boardColumns.ts and
 * BoardColumnSection.
 */
import { useEffect, useState } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { Storyline } from '../api/storyline';
import { useBoardMoves } from '../hooks/useBoardMoves';
import { useChapterLabels } from '../hooks/useChapterLabels';
import { boardColumns, type BoardTarget } from '../lib/boardColumns';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardColumnSection } from './BoardColumnSection';
import { BoardMoveDialog } from './BoardMoveDialog';

/** What the board needs. */
export interface ChapterBoardProps {
  slug: string;
  storyline: Storyline;
  refresh: () => Promise<void>;
  addChapter: (actId: string | null) => Promise<void>;
}

/**
 * Renders the board.
 *
 * @returns the columns, the failure message and the question dialog
 */
export function ChapterBoard({ slug, storyline, refresh, addChapter }: ChapterBoardProps) {
  const { t } = useAtlasTranslation();
  const moves = useBoardMoves(storyline, refresh);
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [movedCode, setMovedCode] = useState<string | null>(null);
  const columns = boardColumns(storyline.chapters, storyline.acts);
  const labelOf = useChapterLabels(storyline.chapters);

  // Focus follows the moved card once the board has redrawn with it in its new place.
  useEffect(() => {
    if (movedCode !== null) document.getElementById(`atlas-board-card-${movedCode}`)?.focus();
  }, [storyline, movedCode]);

  /** Moves a card and remembers it for the focus. */
  function move(code: string, target: BoardTarget) {
    setDraggingCode(null);
    setMovedCode(code);
    void moves.move(code, target);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {moves.failed && <Notice tone="error">{t('storyline.board.moveFailed')}</Notice>}
      <div className="grid min-w-0 items-start gap-x-[18px] gap-y-8 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column, columnIndex) => (
          <BoardColumnSection
            key={column.actId ?? 'no-act'}
            slug={slug}
            storyline={storyline}
            columns={columns}
            columnIndex={columnIndex}
            labelOf={labelOf}
            draggingCode={draggingCode}
            setDraggingCode={setDraggingCode}
            move={move}
            addChapter={addChapter}
          />
        ))}
      </div>
      <BoardMoveDialog
        isOpen={moves.pendingMove !== null}
        onConfirm={() => void moves.confirm()}
        onClose={moves.cancel}
      />
    </div>
  );
}
