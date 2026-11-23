/**
 * ChapterBoard: the chapters as cards in act columns (story S1-E17-19).
 *
 * One column per act, then "No act"; on a phone the columns stack. A move (a drag, or a card's
 * "…" menu) saves at once and the chapter numbers follow; a move that would renumber published
 * chapters asks first (BoardMoveDialog). After a move, focus goes back to the moved card, so a
 * keyboard user can keep moving it. While a card is dragged (CALM-9, board E28), a lifted copy
 * follows the pointer and a polite live region says where it would land ("Becomes chapter 4").
 * Who uses it: StorylinePage. What it calls: useBoardMoves, useBoardDrag, lib/boardColumns.ts,
 * lib/boardDrag.ts, BoardColumnSection and BoardCardFace.
 */
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useEffect, useState } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { Storyline } from '../api/storyline';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardMoves } from '../hooks/useBoardMoves';
import { useChapterLabels } from '../hooks/useChapterLabels';
import { boardColumns, type BoardTarget } from '../lib/boardColumns';
import { numberAfterMove } from '../lib/boardDrag';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardCardFace } from './BoardCardFace';
import { BoardColumnSection } from './BoardColumnSection';
import { BoardMoveDialog } from './BoardMoveDialog';

/** What the board needs. */
export interface ChapterBoardProps {
  slug: string;
  storyline: Storyline;
  refresh: () => Promise<void>;
  addChapter: (actId: string | null) => Promise<void>;
}

/** The words for where a dragged card would land: its new number, or "Lands here". */
function useGapLabel(storyline: Storyline, draggedCode: string | null, target: BoardTarget | null) {
  const { t } = useAtlasTranslation();
  if (draggedCode === null || target === null) return '';
  const number = numberAfterMove(storyline.chapters, storyline.acts, draggedCode, target);
  // A prologue, interlude or epilogue has no number, so the gap only says where it goes.
  if (number === null) return t('storyline.board.landsHere');
  return t('storyline.board.becomesChapter', { number });
}

/** The lifted copy of the dragged card that follows the pointer (board E28). */
function LiftedCard(props: { slug: string; storyline: Storyline; code: string | null }) {
  const { t } = useAtlasTranslation();
  const labelOf = useChapterLabels(props.storyline.chapters);
  const chapter = props.storyline.chapters.find((candidate) => candidate.code === props.code);
  if (chapter === undefined) return null;
  // Who tells it, as on the card: the Narrator, a character's name, or nobody yet.
  const character = props.storyline.characters.find(
    (candidate) => candidate.id === chapter.povCharacterId,
  );
  const teller = chapter.povIsNarrator ? t('chapterPlan.narrator') : (character?.name ?? null);
  return (
    // Tilted 2.5 degrees with a deep shadow, as if picked up off the board.
    <div className="rotate-[2.5deg] cursor-grabbing rounded-card border border-border bg-surface shadow-popover">
      <BoardCardFace
        slug={props.slug}
        chapter={chapter}
        label={labelOf(chapter.code)}
        povName={teller}
        menu={<span className="size-11 flex-none" />}
        isCopy
      />
    </div>
  );
}

/**
 * Renders the board.
 *
 * @returns the columns, the failure message, the dragged card's copy and the question dialog
 */
export function ChapterBoard({ slug, storyline, refresh, addChapter }: ChapterBoardProps) {
  const { t } = useAtlasTranslation();
  const moves = useBoardMoves(storyline, refresh);
  const [movedCode, setMovedCode] = useState<string | null>(null);
  const columns = boardColumns(storyline.chapters, storyline.acts);
  const labelOf = useChapterLabels(storyline.chapters);

  // Focus follows the moved card once the board has redrawn with it in its new place.
  useEffect(() => {
    if (movedCode !== null) document.getElementById(`atlas-board-card-${movedCode}`)?.focus();
  }, [storyline, movedCode]);

  /** Moves a card and remembers it for the focus. */
  function move(code: string, target: BoardTarget) {
    setMovedCode(code);
    void moves.move(code, target);
  }

  const drag = useBoardDrag(storyline, move);
  const gapLabel = useGapLabel(storyline, drag.draggedCode, drag.target);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {moves.failed && <Notice tone="error">{t('storyline.board.moveFailed')}</Notice>}
      {/* Says where a dragged card would land, in the interface language. */}
      <p aria-live="polite" className="sr-only">
        {gapLabel}
      </p>
      <DndContext {...drag.contextProps}>
        <div className="grid min-w-0 items-start gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column, columnIndex) => (
            <BoardColumnSection
              key={column.actId ?? 'no-act'}
              slug={slug}
              storyline={storyline}
              columns={columns}
              columnIndex={columnIndex}
              labelOf={labelOf}
              draggedCode={drag.draggedCode}
              dropTarget={drag.target}
              gapLabel={gapLabel}
              move={move}
              addChapter={addChapter}
            />
          ))}
        </div>
        <DragOverlay>
          <LiftedCard slug={slug} storyline={storyline} code={drag.draggedCode} />
        </DragOverlay>
      </DndContext>
      <BoardMoveDialog
        isOpen={moves.pendingMove !== null}
        onConfirm={() => void moves.confirm()}
        onClose={moves.cancel}
      />
    </div>
  );
}
