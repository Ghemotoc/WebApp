/**
 * shelfPaging: where one arrow press moves a sideways row (bundle FIXES-1, part a; Robert,
 * 5 Nov 2026, 06:53 and 15:02 UTC).
 *
 * Robert's rule: "before an item becomes faded, you should have the option of seeing it fully",
 * and the row moves "one section at a time". So an arrow press moves by whole cards, not by a
 * fixed distance:
 *   - Forward: the first card the right fade touches (or the edge cuts) becomes fully visible,
 *     placed as far right as it can go while staying clear of the right fade, at most one fade
 *     width in; the card before it slides into the left edge, part-shown.
 *   - Back: the mirror image. The last card the left fade touches becomes fully visible, clear of
 *     the left fade; the card after it is part-shown at the right edge.
 * A card wider than the clear space (very narrow screens) falls back to moving most of a screen.
 * The fade is 140 px (boards), or a fifth of the row on narrow screens, so a phone keeps room for
 * a whole card (fadeWidthFor()).
 * Who calls it: useShelfScroll().scrollByPage(), for the arrow buttons. Pure functions, so the
 * unit tests in shelfPaging.test.ts can check them without a browser.
 */

/** The board's fade width, on screens wide enough for it. */
export const SHELF_FADE_PIXELS = 140;

/** One card's left and right edge, in the row's scrolling content (0 is the row's start). */
export interface CardEdges {
  start: number;
  end: number;
}

/** Where the row is: how far it has scrolled, how wide it shows and how wide its content is. */
export interface RowPosition {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/**
 * How wide the fade is for a row: the board's 140 px, but never more than a fifth of the row.
 *
 * @param clientWidth - the row's visible width
 * @returns the fade width in pixels
 */
export function fadeWidthFor(clientWidth: number): number {
  return Math.min(SHELF_FADE_PIXELS, Math.round(clientWidth * 0.2));
}

/**
 * Keeps a number between two limits.
 *
 * @returns the number, or the nearer limit
 */
function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}

/**
 * How far in from its edge a card may sit and still be clear of the fade on the other side.
 *
 * @param card - the card
 * @param clientWidth - the row's visible width
 * @param fade - the fade width
 * @returns a gap between 0 and one fade width
 */
function roomBeside(card: CardEdges, clientWidth: number, fade: number): number {
  return clamp(clientWidth - fade - (card.end - card.start), 0, fade);
}

/** The fallback move when a card is wider than the clear space: most of a screen, 240 px or more. */
function screenStep(clientWidth: number): number {
  return Math.max(240, clientWidth * 0.8);
}

/**
 * Whether a card can sit fully clear of the fade at all.
 *
 * @returns false for a card wider than the row minus one fade
 */
function fitsBesideFade(card: CardEdges, clientWidth: number, fade: number): boolean {
  return card.end - card.start <= clientWidth - fade;
}

/**
 * The scroll position after one forward press.
 *
 * @returns the new scrollLeft (before the browser clamps it to the row)
 */
function forwardTarget(cards: readonly CardEdges[], row: RowPosition, fade: number): number {
  // Step 1: the first card the right fade touches or the edge cuts (1 px of slack for rounding).
  const visibleEnd = row.scrollLeft + row.clientWidth;
  const next = cards.find((card) => card.end > visibleEnd - fade + 1);
  if (next === undefined) return row.scrollWidth;
  // Step 2: a card too wide to be fully clear: move most of a screen instead.
  const step = row.scrollLeft + screenStep(row.clientWidth);
  if (!fitsBesideFade(next, row.clientWidth, fade)) return step;
  // Step 3: bring it fully in, as far right as it can sit clear of the right fade (never a press
  // that doesn't move).
  const target = next.start - roomBeside(next, row.clientWidth, fade);
  return target > row.scrollLeft + 1 ? target : step;
}

/**
 * The scroll position after one back press.
 *
 * @returns the new scrollLeft (before the browser clamps it to the row)
 */
function backTarget(cards: readonly CardEdges[], row: RowPosition, fade: number): number {
  // Step 1: the last card the left fade touches or the edge cuts.
  const touched = cards.filter((card) => card.start < row.scrollLeft + fade - 1);
  const previous = touched.at(-1);
  if (previous === undefined) return 0;
  // Step 2: as forward, a card too wide to be fully clear moves most of a screen.
  const step = row.scrollLeft - screenStep(row.clientWidth);
  if (!fitsBesideFade(previous, row.clientWidth, fade)) return step;
  // Step 3: bring it fully in, its right edge as far left as it can sit clear of the left fade.
  const target = previous.end - (row.clientWidth - roomBeside(previous, row.clientWidth, fade));
  return target < row.scrollLeft - 1 ? target : step;
}

/**
 * Where the row should scroll for one arrow press.
 *
 * @param cards - every card's edges, in order
 * @param row - where the row is now
 * @param direction - 'forward' (right) or 'back' (left)
 * @returns the new scrollLeft, kept between the start and the end of the row
 */
export function pageTarget(
  cards: readonly CardEdges[],
  row: RowPosition,
  direction: 'back' | 'forward',
): number {
  const fade = fadeWidthFor(row.clientWidth);
  const target =
    direction === 'forward' ? forwardTarget(cards, row, fade) : backTarget(cards, row, fade);
  return clamp(target, 0, Math.max(0, row.scrollWidth - row.clientWidth));
}
