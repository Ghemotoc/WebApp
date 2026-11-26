/**
 * BoardCard: one chapter on the chapter board (story S1-E17-19; CALM-9, board E28).
 *
 * The card is a drag source and a drop zone (dnd-kit, set up in hooks/useBoardDrag.ts). The whole
 * card is the handle, so a writer can press and hold anywhere on it on a phone; the six-dot grip
 * says so. While it is dragged, the card stays in its place as a faint outline and a lifted copy
 * follows the pointer (ChapterBoard's DragOverlay). Its "…" menu (BoardCardMenu) does the same
 * four moves by keyboard or with one tap (WCAG 2.5.7).
 * Who uses it: BoardColumnSection. What it calls: BoardCardFace, BoardCardMenu and dnd-kit.
 */
import { useDraggable, useDroppable } from '@dnd-kit/core';

import type { StorylineChapter } from '../api/storyline';
import { cardDropId } from '../lib/boardDrag';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardCardFace } from './BoardCardFace';
import { BoardCardMenu, type BoardCardMenuProps } from './BoardCardMenu';

/** What the card needs: what it shows and its four move handlers. */
export interface BoardCardProps extends Omit<BoardCardMenuProps, 'title'> {
  slug: string;
  chapter: StorylineChapter;
  /** "Chapter 3", "Prologue" … */
  label: string;
  /** The point-of-view character's name, or null. */
  povName: string | null;
}

/** The card's look: lifted on the board, a faint outline while its copy is being dragged. */
function cardClasses(isDragged: boolean): string {
  const base = 'touch-manipulation rounded-field border select-none [-webkit-touch-callout:none]';
  if (isDragged) {
    // Board E28: the old place shows a faint outline (opacity .45, an inset 2 px line ring).
    return `${base} border-transparent bg-transparent opacity-45 shadow-[inset_0_0_0_2px_var(--border)]`;
  }
  // Board E28 (.acard): a solid card with 12 px corners and a soft shadow on the tinted column.
  return `${base} cursor-grab border-transparent bg-surface-solid shadow-card`;
}

/**
 * Renders the card.
 *
 * @returns the list item with the chapter's details and its menu
 */
export function BoardCard(props: BoardCardProps) {
  const { t } = useAtlasTranslation();
  const { slug, chapter, label, povName } = props;
  const title = chapter.title === '' ? t('storyline.board.untitled') : chapter.title;
  // The card is dragged by its code, and other cards are dropped on it by "card:<code>".
  const draggable = useDraggable({ id: chapter.code });
  const droppable = useDroppable({ id: cardDropId(chapter.code) });
  return (
    <li
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      id={`atlas-board-card-${chapter.code}`}
      tabIndex={-1}
      data-testid="atlas-board-card"
      className={cardClasses(draggable.isDragging)}
      // Only the pointer listeners: the keyboard moves the card through its menu instead.
      {...draggable.listeners}
    >
      <BoardCardFace
        slug={slug}
        chapter={chapter}
        label={label}
        povName={povName}
        menu={<BoardCardMenu title={title} {...props} />}
      />
    </li>
  );
}
