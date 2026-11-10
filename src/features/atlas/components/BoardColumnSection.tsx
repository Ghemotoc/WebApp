/**
 * BoardColumnSection: one act's column on the chapter board (story S1-E17-19), or "No act".
 *
 * No box of its own (bundle G10 ATLAS, part c1; board AtlasStoryline): the act's name as a heading
 * with its chapter count, its chapters as glass cards in book order, then "Add chapter", which
 * adds a draft at the end of this act. Dropping a card on the column (not on a card) puts it at
 * the column's end. Who uses it: ChapterBoard. What it calls: BoardCard and the handlers it is
 * given.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { Storyline } from '../api/storyline';
import type { BoardColumn, BoardTarget } from '../lib/boardColumns';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardCard } from './BoardCard';

/** What the column needs. */
export interface BoardColumnSectionProps {
  slug: string;
  storyline: Storyline;
  columns: BoardColumn[];
  columnIndex: number;
  /** "Chapter 3" or "Prologue" for each chapter. */
  labelOf: (code: string) => string;
  /** The code of the card being dragged, or null. */
  draggingCode: string | null;
  setDraggingCode: (code: string | null) => void;
  move: (code: string, target: BoardTarget) => void;
  addChapter: (actId: string | null) => Promise<void>;
}

/** The move handlers for the card at a place in this column; null where a move can't go. */
function movesFor(props: BoardColumnSectionProps, index: number, code: string) {
  const { columns, columnIndex, move } = props;
  const column = columns[columnIndex];
  const previousColumn = columns[columnIndex - 1];
  const nextColumn = columns[columnIndex + 1];
  const count = column?.chapters.length ?? 0;
  const actId = column?.actId ?? null;
  return {
    onEarlier: index > 0 ? () => move(code, { actId, index: index - 1 }) : null,
    onLater: index < count - 1 ? () => move(code, { actId, index: index + 1 }) : null,
    onPreviousAct:
      previousColumn === undefined
        ? null
        : () => move(code, { actId: previousColumn.actId, index: previousColumn.chapters.length }),
    onNextAct:
      nextColumn === undefined ? null : () => move(code, { actId: nextColumn.actId, index: 0 }),
  };
}

/** "Add chapter", with a plain message when it fails. */
function AddChapterButton({ name, onAdd }: { name: string; onAdd: () => Promise<void> }) {
  const { t } = useAtlasTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        className="h-9 self-start px-4 text-[13px]"
        aria-label={t('storyline.board.addChapterIn', { name })}
        onClick={() => {
          setFailed(false);
          onAdd().catch(() => setFailed(true));
        }}
      >
        <ActionIcon name="plus" size={14} />
        {t('storyline.board.addChapter')}
      </Button>
      {failed && <Notice tone="error">{t('storyline.board.addFailed')}</Notice>}
    </div>
  );
}

/** The column's cards, each a drag source and a drop zone. */
function ColumnCards(props: BoardColumnSectionProps & { column: BoardColumn }) {
  const { slug, storyline, column, draggingCode, move } = props;
  // Where a dropped card lands, counted without the card itself (it may come from this column).
  const othersBefore = (code: string) =>
    column.chapters
      .filter((chapter) => chapter.code !== draggingCode)
      .findIndex((chapter) => chapter.code === code);
  const povNameOf = (id: string | null) =>
    storyline.characters.find((character) => character.id === id)?.name ?? null;
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0 empty:hidden">
      {column.chapters.map((chapter, index) => (
        <BoardCard
          key={chapter.code}
          slug={slug}
          chapter={chapter}
          label={props.labelOf(chapter.code)}
          povName={povNameOf(chapter.povCharacterId)}
          onDragStart={() => props.setDraggingCode(chapter.code)}
          onDropOnCard={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (draggingCode !== null && draggingCode !== chapter.code) {
              move(draggingCode, { actId: column.actId, index: othersBefore(chapter.code) });
            }
          }}
          {...movesFor(props, index, chapter.code)}
        />
      ))}
    </ol>
  );
}

/**
 * Renders the column.
 *
 * @returns the labelled section with its cards and "Add chapter"
 */
export function BoardColumnSection(props: BoardColumnSectionProps) {
  const { t } = useAtlasTranslation();
  const { columns, columnIndex, draggingCode, move } = props;
  const column = columns[columnIndex];
  if (column === undefined) return null;
  const name = column.name ?? t('storyline.board.noAct');
  const headingId = `atlas-board-column-${columnIndex}`;
  const restCount = column.chapters.filter((chapter) => chapter.code !== draggingCode).length;

  return (
    <section aria-labelledby={headingId} data-testid="atlas-board-column" className="min-w-0">
      {/* The column's drop zone: a card dropped here (not on a card) goes to the column's end. */}
      <div
        role="presentation"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingCode !== null) move(draggingCode, { actId: column.actId, index: restCount });
        }}
        className="flex h-full flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id={headingId}
            className="m-0 min-w-0 font-heading text-lg font-bold break-words text-heading"
          >
            {name}
          </h2>
          {/* How many chapters the act holds; the list below says the same to a screen reader. */}
          <span aria-hidden="true" className="text-sm text-meta">
            {column.chapters.length}
          </span>
        </div>
        {column.chapters.length === 0 && (
          <p className="m-0 text-sm text-meta">{t('storyline.board.empty')}</p>
        )}
        <ColumnCards {...props} column={column} />
        <AddChapterButton name={name} onAdd={async () => props.addChapter(column.actId)} />
      </div>
    </section>
  );
}
