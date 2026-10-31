/**
 * boardColumns: the chapter board's columns and moves (story S1-E17-19).
 *
 * The board shows one column per act, in the acts' order, then "No act" for chapters without
 * one. Inside a column the chapters keep their book order. A move puts a chapter at a place in a
 * column and works out the whole book's new order, leaving every other chapter where it was, so
 * only the chapters the writer moved change places (place_chapter_on_board() saves it).
 * Who calls it: hooks/useBoardMoves.ts and components/ChapterBoard.tsx. What it calls: nothing.
 */
import type { StorylineAct, StorylineChapter } from '../api/storyline';

/** One column of the board. */
export interface BoardColumn {
  /** The act's ID, or null for "No act". */
  actId: string | null;
  /** The act's name, or null for "No act". */
  name: string | null;
  chapters: StorylineChapter[];
}

/**
 * Splits the chapters into the board's columns.
 *
 * @param chapters - the story's chapters in book order
 * @param acts - the plan's acts in their order
 * @returns one column per act, then "No act" (always there, so a card can be moved into it)
 */
export function boardColumns(chapters: StorylineChapter[], acts: StorylineAct[]): BoardColumn[] {
  // Step 1: a column for each act, with the chapters that sit in it.
  const actColumns = acts.map((act) => ({
    actId: act.id,
    name: act.name,
    chapters: chapters.filter((chapter) => chapter.actId === act.id),
  }));
  // Step 2: the rest (no act, or an act that is gone) in "No act".
  const knownActIds = new Set(acts.map((act) => act.id));
  const looseChapters = chapters.filter(
    (chapter) => chapter.actId === null || !knownActIds.has(chapter.actId),
  );
  return [...actColumns, { actId: null, name: null, chapters: looseChapters }];
}

/** Where a chapter is going: a column and a place in it (from 0). */
export interface BoardTarget {
  actId: string | null;
  index: number;
}

/**
 * The chapter that a moved card lands after when its new column has nothing above it: the last
 * chapter of the columns before it, or null when it should go first.
 */
function anchorBefore(columns: BoardColumn[], columnIndex: number): string | null {
  for (let earlier = columnIndex - 1; earlier >= 0; earlier -= 1) {
    const earlierChapters = columns[earlier]?.chapters ?? [];
    const last = earlierChapters[earlierChapters.length - 1];
    if (last !== undefined) return last.code;
  }
  return null;
}

/**
 * The book's order after moving one chapter to a place in a column.
 *
 * @param chapters - the story's chapters in book order
 * @param acts - the plan's acts
 * @param chapterCode - the chapter being moved
 * @param target - its column and its place in that column, counted without it
 * @returns every chapter's code in the new order
 */
export function orderAfterMove(
  chapters: StorylineChapter[],
  acts: StorylineAct[],
  chapterCode: string,
  target: BoardTarget,
): string[] {
  // Step 1: the board without the moved card.
  const others = chapters.filter((chapter) => chapter.code !== chapterCode);
  const columns = boardColumns(others, acts);
  const columnIndex = columns.findIndex((column) => column.actId === target.actId);
  const column = columns[Math.max(columnIndex, 0)];
  const order = others.map((chapter) => chapter.code);
  // Step 2: in front of the card now at that place, or behind the column's last card.
  const before = column?.chapters[target.index];
  if (before !== undefined) {
    order.splice(order.indexOf(before.code), 0, chapterCode);
    return order;
  }
  const lastInColumn = column?.chapters[column.chapters.length - 1];
  const anchor = lastInColumn?.code ?? anchorBefore(columns, columnIndex);
  // Step 3: an empty column goes after the earlier columns' last chapter (or first of all).
  order.splice(anchor === null ? 0 : order.indexOf(anchor) + 1, 0, chapterCode);
  return order;
}

/**
 * Chapter numbers as the plan counts them: only chapters of the type "chapter" are numbered, so
 * a prologue doesn't make the first chapter "Chapter 2" (S1-E17-19: "Prologue, Chapter 3,
 * Epilogue…").
 *
 * @param chapters - the chapters in book order
 * @returns each numbered chapter's code with its number
 */
export function chapterNumbers(chapters: { code: string; kind: string }[]): Map<string, number> {
  const numbers = new Map<string, number>();
  for (const chapter of chapters) {
    if (chapter.kind === 'chapter') numbers.set(chapter.code, numbers.size + 1);
  }
  return numbers;
}
