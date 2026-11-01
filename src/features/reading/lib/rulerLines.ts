/**
 * The reading ruler's lines (bundle IDEAS-1, part a; idea IDEA-20261031-8): turns the boxes a
 * browser gives for the chapter's text into one entry per line, and finds the line under the
 * pointer or the next one for the arrow keys.
 *
 * Who calls it: components/ReadingRuler.tsx. What it calls: nothing; tested in rulerLines.test.ts.
 */

/** One line of text, measured from the top of the chapter's box, in px. */
export interface RulerLine {
  top: number;
  bottom: number;
}

/** Two boxes count as one line when they share at least this much of their height. */
const sameLineShare = 0.5;

/**
 * Whether a box sits on a line already found.
 *
 * @param line - the line so far
 * @param box - the next box
 * @returns true when they overlap by half the smaller height or more
 */
function sharesLine(line: RulerLine, box: RulerLine): boolean {
  const overlap = Math.min(line.bottom, box.bottom) - Math.max(line.top, box.top);
  const smallerHeight = Math.min(line.bottom - line.top, box.bottom - box.top);
  return smallerHeight > 0 && overlap >= smallerHeight * sameLineShare;
}

/**
 * Joins the text's boxes into lines, top to bottom.
 *
 * @param boxes - every box of the text (a word run, a bold word, a link), any order
 * @returns the lines, each as tall as the boxes on it, without empty ones
 */
export function linesFromBoxes(boxes: RulerLine[]): RulerLine[] {
  // Step 1: top to bottom, leaving out boxes with no height (empty text, a line break).
  const sorted = boxes.filter((box) => box.bottom > box.top).sort((a, b) => a.top - b.top);
  // Step 2: each box joins the line it shares, or starts the next one.
  const lines: RulerLine[] = [];
  for (const box of sorted) {
    const last = lines.at(-1);
    if (last !== undefined && sharesLine(last, box)) {
      last.top = Math.min(last.top, box.top);
      last.bottom = Math.max(last.bottom, box.bottom);
    } else {
      lines.push({ top: box.top, bottom: box.bottom });
    }
  }
  return lines;
}

/**
 * The line under a point, or the nearest one when the point is between lines.
 *
 * @param lines - the lines, top to bottom
 * @param y - the point, from the top of the chapter's box
 * @returns the line's index, or null when there are no lines
 */
export function lineAt(lines: RulerLine[], y: number): number | null {
  if (lines.length === 0) return null;
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  lines.forEach((line, index) => {
    // Inside the line counts as no distance; otherwise, how far to its nearer edge.
    const distance = y < line.top ? line.top - y : Math.max(0, y - line.bottom);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
}

/**
 * The line an arrow key moves to.
 *
 * @param current - the line the ruler is on
 * @param step - 1 for the next line, -1 for the one before
 * @param lineCount - how many lines there are
 * @returns the new index, kept between the first and last line
 */
export function stepLine(current: number, step: 1 | -1, lineCount: number): number {
  return Math.min(lineCount - 1, Math.max(0, current + step));
}
