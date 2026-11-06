/**
 * shelfPaging: where one arrow press moves a sideways row, and how wide its fades are (bundle
 * FIXES-1, part a; Robert, 5 Nov 2026, 06:53 and 15:02 UTC; both fades, 6 Nov 2026, 06:25 UTC).
 *
 * Robert's rule: "before an item becomes faded, you should have the option of seeing it fully",
 * and the row moves "one section at a time". Each edge of a row fades while cards are hidden past it
 * (useShelfScroll), so after a press both edges can be faded. An arrow press therefore moves by
 * whole cards, not by a fixed distance, and lands the card in the clear space between the fades:
 *   - Forward: the first card the right fade touches (or the edge cuts) becomes fully visible,
 *     its left edge one fade width in, clear of the left fade that now shows; the card before it
 *     sits under the left fade, part-shown.
 *   - Back: the mirror image. The last card the left fade touches becomes fully visible, its
 *     right edge one fade width in from the right; the card after it is part-shown under the
 *     right fade.
 * The fade is 140 px (boards), never more than a fifth of the row, and narrow enough that the
 * widest card fits between two fades (fadeWidthFor()). A card too wide even for that falls back
 * to moving most of a screen.
 * Who calls it: useShelfScroll().scrollByPage(), for the arrow buttons. Pure functions, so the
 * unit tests in shelfPaging.test.ts can check them without a browser.
 */

/** The board's fade width, on screens wide enough for it. */
export const SHELF_FADE_PIXELS = 140;

/** The narrowest a fade gets on a very small screen, so it still reads as a fade. */
export const SHELF_FADE_MINIMUM_PIXELS = 24;

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
 * How wide each fade is for a row.
 *
 * Three limits, the smallest wins: the board's 140 px; a fifth of the row, so a phone isn't
 * mostly fade; and half of what is left beside the widest card, so that card fits fully between
 * a left and a right fade. The result is never below 24 px.
 *
 * @param clientWidth - the row's visible width
 * @param widestCard - the widest card's width (0 when not known, which leaves only the first two)
 * @returns the fade width in pixels
 */
export function fadeWidthFor(clientWidth: number, widestCard = 0): number {
  // Step 1: the board's width, capped at a fifth of the row.
  const fromRow = Math.min(SHELF_FADE_PIXELS, Math.round(clientWidth * 0.2));
  if (widestCard <= 0) return fromRow;
  // Step 2: leave room for the widest card between two fades.
  const besideCard = Math.floor((clientWidth - widestCard) / 2);
  return Math.max(SHELF_FADE_MINIMUM_PIXELS, Math.min(fromRow, besideCard));
}

/**
 * The widest of the row's cards.
 *
 * @param cards - every card's edges
 * @returns the widest width, or 0 for an empty row
 */
export function widestCardOf(cards: readonly CardEdges[]): number {
  return cards.reduce((widest, card) => Math.max(widest, card.end - card.start), 0);
}

/**
 * Keeps a number between two limits.
 *
 * @returns the number, or the nearer limit
 */
function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}

/** The fallback move when a card is wider than the clear space: most of a screen, 240 px or more. */
function screenStep(clientWidth: number): number {
  return Math.max(240, clientWidth * 0.8);
}

/**
 * Whether a card can sit fully clear of both fades at once.
 *
 * @returns false for a card wider than the row minus two fades
 */
function fitsBetweenFades(card: CardEdges, clientWidth: number, fade: number): boolean {
  return card.end - card.start <= clientWidth - 2 * fade;
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
  if (!fitsBetweenFades(next, row.clientWidth, fade)) return step;
  // Step 3: bring it fully in, its left edge one fade width in, just clear of the left fade
  // (never a press that doesn't move).
  const target = next.start - fade;
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
  if (!fitsBetweenFades(previous, row.clientWidth, fade)) return step;
  // Step 3: bring it fully in, its right edge one fade width in from the right, just clear of
  // the right fade.
  const target = previous.end - (row.clientWidth - fade);
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
  // The same fade width the Shelf draws (useShelfScroll measures the same cards).
  const fade = fadeWidthFor(row.clientWidth, widestCardOf(cards));
  const target =
    direction === 'forward' ? forwardTarget(cards, row, fade) : backTarget(cards, row, fade);
  return clamp(target, 0, Math.max(0, row.scrollWidth - row.clientWidth));
}
