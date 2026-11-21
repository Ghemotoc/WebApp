/**
 * chapterDots: which dots the chapter navigation draws under the paper (bundle CALM-5; design
 * handover Step 3, "Reader on wide screens", point 5).
 *
 * One dot per chapter, up to 15. With more than 15 chapters the 15 around the current one show:
 * 7 on each side where there are that many, shifted at the start and the end so there are
 * always 15. Each dot says whether that chapter comes before the current one (read), is the
 * current one, or comes after it (ahead); the colours live in ChapterNavigation.
 * Who calls it: ChapterNavigation. What it calls: nothing; plain numbers, tested in
 * chapterDots.test.ts.
 */

/** Where a chapter stands against the one being read. */
export type ChapterDot = 'read' | 'current' | 'ahead';

/** At most this many dots (handover Step 3, point 5). */
const mostDots = 15;

/**
 * Lists the dots to draw.
 *
 * @param current - the chapter being read, from 1
 * @param total - how many chapters readers can open
 * @returns one entry per dot, in order, with the chapter's number and its kind
 */
export function chapterDots(
  current: number,
  total: number,
): { number: number; kind: ChapterDot }[] {
  // Step 1: the window of chapters, centred on the current one and kept inside 1 to total.
  const shown = Math.min(total, mostDots);
  const half = Math.floor(shown / 2);
  const firstWanted = current - half;
  const first = Math.max(1, Math.min(firstWanted, total - shown + 1));
  // Step 2: one dot for each chapter in the window.
  const dots: { number: number; kind: ChapterDot }[] = [];
  for (let number = first; number < first + shown; number += 1) {
    let kind: ChapterDot = 'ahead';
    if (number < current) kind = 'read';
    if (number === current) kind = 'current';
    dots.push({ number, kind });
  }
  return dots;
}
