/**
 * BoardColumnSection: one act's column on the chapter board (story S1-E17-19), or "No act".
 *
 * A tinted box (story 6.9, board E28, .acol): the act's name as a label with its chapter count,
 * its chapters as cards in book order, then the text button "Add chapter", which adds a draft at
 * the end of this act. An act (never "No act") also has a pen button, "Edit act", to rename or
 * delete it (bundle GAPS-2a). The column is a drop zone too (CALM-9, board E28): while a card is dragged
 * over it, it gets a ring in the main colour, and a dashed gap saying "Becomes chapter N" opens
 * where the card will land; a card dropped on its empty space goes to the column's end.
 * Who uses it: ChapterBoard. What it calls: BoardCard, EditActForm, dnd-kit and the handlers it
 * is given.
 */
import { useDroppable } from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { Storyline } from '../api/storyline';
import type { BoardColumn, BoardTarget } from '../lib/boardColumns';
import { columnDropId, landingGapDropId } from '../lib/boardDrag';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardCard } from './BoardCard';
import { EditActForm } from './EditActForm';

/** What the column needs. */
export interface BoardColumnSectionProps {
  slug: string;
  storyline: Storyline;
  columns: BoardColumn[];
  columnIndex: number;
  /** "Chapter 3" or "Prologue" for each chapter. */
  labelOf: (code: string) => string;
  /** The code of the card being dragged, or null. */
  draggedCode: string | null;
  /** Where the dragged card would land, or null while it would change nothing. */
  dropTarget: BoardTarget | null;
  /** The words in the gap ("Becomes chapter 4"). */
  gapLabel: string;
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
        variant="text"
        className="gap-2 self-start"
        aria-label={t('storyline.board.addChapterIn', { name })}
        onClick={() => {
          setFailed(false);
          onAdd().catch(() => setFailed(true));
        }}
      >
        <ActionIcon name="plus" size={16} />
        {t('storyline.board.addChapter')}
      </Button>
      {failed && <Notice tone="error">{t('storyline.board.addFailed')}</Notice>}
    </div>
  );
}

/** The dashed gap that opens where a dragged card will land (board E28). */
function LandingGap({ label }: { label: string }) {
  // The gap is a drop zone too, so a card let go over it lands where it shows (lib/boardDrag.ts).
  const { setNodeRef } = useDroppable({ id: landingGapDropId });
  // The board's live region says the same words, so the gap itself stays out of a screen reader.
  return (
    <li
      ref={setNodeRef}
      aria-hidden="true"
      data-testid="atlas-board-gap"
      className="grid min-h-16 place-items-center rounded-card border-2 border-dashed border-(--accent) px-3 text-center type-label text-(--accent)"
    >
      {label}
    </li>
  );
}

/** Where the gap goes in the column's list, which still holds the dragged card; null for none. */
function gapPosition(props: BoardColumnSectionProps, column: BoardColumn): number | null {
  const { dropTarget, draggedCode } = props;
  if (dropTarget === null || dropTarget.actId !== column.actId) return null;
  // The target counts places without the dragged card; find that card's place in the full list.
  const others = column.chapters.filter((chapter) => chapter.code !== draggedCode);
  const before = others[dropTarget.index];
  if (before === undefined) return column.chapters.length;
  return column.chapters.findIndex((chapter) => chapter.code === before.code);
}

/** The column's cards, with the landing gap among them while a card is dragged here. */
function ColumnCards(props: BoardColumnSectionProps & { column: BoardColumn }) {
  const { t } = useAtlasTranslation();
  const { slug, storyline, column } = props;
  const gapAt = gapPosition(props, column);
  // Who tells a chapter, in words: the Narrator, a character's name, or null for nobody yet.
  const tellerOf = (chapter: BoardColumn['chapters'][number]) =>
    chapter.povIsNarrator
      ? t('chapterPlan.narrator')
      : (storyline.characters.find((character) => character.id === chapter.povCharacterId)?.name ??
        null);
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0 empty:hidden">
      {column.chapters.map((chapter, index) => (
        <ColumnCardSlot key={chapter.code} showGap={gapAt === index} gapLabel={props.gapLabel}>
          <BoardCard
            slug={slug}
            chapter={chapter}
            label={props.labelOf(chapter.code)}
            povName={tellerOf(chapter)}
            {...movesFor(props, index, chapter.code)}
          />
        </ColumnCardSlot>
      ))}
      {gapAt === column.chapters.length && <LandingGap label={props.gapLabel} />}
    </ol>
  );
}

/** One card, with the landing gap in front of it when the dragged card would land there. */
function ColumnCardSlot(props: { showGap: boolean; gapLabel: string; children: ReactNode }) {
  return (
    <>
      {props.showGap && <LandingGap label={props.gapLabel} />}
      {props.children}
    </>
  );
}

/** The column's drop zone look: a ring in the main colour while a card would land in it. */
function columnClasses(isTargeted: boolean): string {
  // Board E28 (.acol): a tinted box with 16 px inside; while a card would land in it
  // (.acol.is-over), an inset 2 px ring in the main colour.
  const base = 'flex h-full flex-col gap-3 rounded-card bg-tint p-4';
  return isTargeted ? `${base} shadow-[inset_0_0_0_2px_var(--plum-to)]` : base;
}

/**
 * Renders the column.
 *
 * @returns the labelled section with "Edit act", its cards and "Add chapter"
 */
export function BoardColumnSection(props: BoardColumnSectionProps) {
  const { t } = useAtlasTranslation();
  const { columns, columnIndex, draggedCode, dropTarget } = props;
  const column = columns[columnIndex];
  // The column is a drop zone; a card dropped on its empty space goes to its end.
  const { setNodeRef } = useDroppable({ id: columnDropId(column?.actId ?? null) });
  if (column === undefined) return null;
  const name = column.name ?? t('storyline.board.noAct');
  const headingId = `atlas-board-column-${columnIndex}`;
  const isTargeted = draggedCode !== null && dropTarget?.actId === column.actId;

  return (
    <section aria-labelledby={headingId} data-testid="atlas-board-column" className="min-w-0">
      <div ref={setNodeRef} className={columnClasses(isTargeted)}>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={headingId}
            className="m-0 min-w-0 flex-1 type-label font-semibold break-words text-ink-heading"
          >
            {name}
          </h2>
          {/* How many chapters the act holds; the list below says the same to a screen reader. */}
          <span aria-hidden="true" className="type-meta text-ink-muted">
            {column.chapters.length}
          </span>
          {column.actId !== null && (
            <EditActForm
              // A fresh form for each name, so a rename closes it and shows the new name.
              key={name}
              slug={props.slug}
              act={{ id: column.actId, name }}
              chapterCount={column.chapters.length}
            />
          )}
        </div>
        {column.chapters.length === 0 && !isTargeted && (
          <p className="m-0 type-meta text-ink-muted">{t('storyline.board.empty')}</p>
        )}
        <ColumnCards {...props} column={column} />
        <AddChapterButton name={name} onAdd={async () => props.addChapter(column.actId)} />
      </div>
    </section>
  );
}
