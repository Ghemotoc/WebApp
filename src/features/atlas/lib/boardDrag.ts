/**
 * boardDrag: where a dragged card on the chapter board would land, and what it would become
 * (CALM-9, board E28: "a dashed gap saying 'Becomes chapter N' opens where it will land").
 *
 * The board's drop zones have IDs: "card:<code>" for each card and "column:<actId>" (or
 * "column:none" for "No act") for each column. While a card is dragged, the pointer is over one
 * of them; these helpers turn that into a BoardTarget (a column and a place in it, counted
 * without the dragged card), say whether it changes anything, and work out the chapter number
 * the card would get. All of it is plain data, so it is tested on its own (boardDrag.test.ts).
 * Who calls it: hooks/useBoardDrag.ts. What it calls: lib/boardColumns.ts.
 */
import type { StorylineAct, StorylineChapter } from '../api/storyline';

import { boardColumns, chapterNumbers, orderAfterMove, type BoardTarget } from './boardColumns';

/**
 * The drop zone ID of the dashed landing gap. The gap pushes the cards below it down, so the
 * pointer that opened it is soon over the gap itself: being over it keeps the place it shows.
 */
export const landingGapDropId = 'gap';

/** The drop zone ID of a card. */
export function cardDropId(code: string): string {
  return `card:${code}`;
}

/** The drop zone ID of a column ("none" stands for "No act", whose act ID is null). */
export function columnDropId(actId: string | null): string {
  return `column:${actId ?? 'none'}`;
}

/** What the pointer is over, read back from a drop zone ID. */
type DropZone = { kind: 'card'; code: string } | { kind: 'column'; actId: string | null };

/** Reads a drop zone ID; null for anything that isn't one of the board's zones. */
function parseDropId(dropId: string): DropZone | null {
  if (dropId.startsWith('card:')) return { kind: 'card', code: dropId.slice('card:'.length) };
  if (!dropId.startsWith('column:')) return null;
  const actId = dropId.slice('column:'.length);
  return { kind: 'column', actId: actId === 'none' ? null : actId };
}

/** What the board needs to place a dragged card. */
export interface DragPlace {
  chapters: StorylineChapter[];
  acts: StorylineAct[];
  /** The card being dragged. */
  draggedCode: string;
  /** The drop zone under the pointer. */
  overId: string;
  /** True when the pointer is in the lower half of the card it is over, so the card goes after. */
  isLowerHalf: boolean;
}

/**
 * Where the dragged card would land.
 *
 * @param place - the chapters, the acts, the dragged card and what the pointer is over
 * @returns the column and the place in it (counted without the dragged card), or null when the
 *   pointer is over the dragged card itself or over nothing the board knows
 */
export function dropTarget(place: DragPlace): BoardTarget | null {
  const zone = parseDropId(place.overId);
  if (zone === null) return null;
  // Step 1: the board as it would be without the dragged card.
  const others = place.chapters.filter((chapter) => chapter.code !== place.draggedCode);
  const columns = boardColumns(others, place.acts);
  // Step 2: over a column's empty space, the card goes to the column's end.
  if (zone.kind === 'column') {
    const column = columns.find((candidate) => candidate.actId === zone.actId);
    return { actId: zone.actId, index: column?.chapters.length ?? 0 };
  }
  if (zone.code === place.draggedCode) return null;
  // Step 3: over a card, in front of it, or behind it from its lower half.
  for (const column of columns) {
    const index = column.chapters.findIndex((chapter) => chapter.code === zone.code);
    if (index >= 0) return { actId: column.actId, index: place.isLowerHalf ? index + 1 : index };
  }
  return null;
}

/**
 * Whether a target leaves the book as it is: the same order and the same act.
 *
 * @param chapters - the chapters in book order
 * @param acts - the plan's acts
 * @param draggedCode - the card being dragged
 * @param target - where it would land
 * @returns true when dropping there would change nothing
 */
export function changesNothing(
  chapters: StorylineChapter[],
  acts: StorylineAct[],
  draggedCode: string,
  target: BoardTarget,
): boolean {
  const newOrder = orderAfterMove(chapters, acts, draggedCode, target).join(',');
  const oldOrder = chapters.map((chapter) => chapter.code).join(',');
  const dragged = chapters.find((chapter) => chapter.code === draggedCode);
  const column = boardColumns(chapters, acts).find((candidate) =>
    candidate.chapters.some((chapter) => chapter.code === draggedCode),
  );
  return newOrder === oldOrder && dragged !== undefined && column?.actId === target.actId;
}

/**
 * The chapter number the dragged card would get at a target, as the plan counts them.
 *
 * @param chapters - the chapters in book order
 * @param acts - the plan's acts
 * @param draggedCode - the card being dragged
 * @param target - where it would land
 * @returns its number, or null for a prologue, interlude or epilogue, which has none
 */
export function numberAfterMove(
  chapters: StorylineChapter[],
  acts: StorylineAct[],
  draggedCode: string,
  target: BoardTarget,
): number | null {
  // Step 1: the book's order after the move, as chapters with their kinds.
  const newOrder = orderAfterMove(chapters, acts, draggedCode, target);
  const byCode = new Map(chapters.map((chapter) => [chapter.code, chapter]));
  const reordered = newOrder.flatMap((code) => {
    const chapter = byCode.get(code);
    return chapter === undefined ? [] : [chapter];
  });
  // Step 2: count the chapters in that order.
  return chapterNumbers(reordered).get(draggedCode) ?? null;
}
