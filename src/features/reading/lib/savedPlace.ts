/**
 * Where to scroll for a saved reading place (story S1-E4-03).
 *
 * Who calls it: SavedPlaceOffer, when the reader asks to go back to where they stopped. The place
 * is measured the way useReadingProgress measures it: the share of the text that has reached the
 * bottom of the window.
 */

/**
 * Where to scroll so that a percentage of the text has reached the bottom of the window.
 *
 * @param textTopOnPage - the text's top, from the top of the page
 * @param textHeight - the text's height
 * @param windowHeight - the window's height
 * @param percent - the place, 0 to 100
 * @returns the page's scroll position, never below 0
 */
export function scrollTopForPlace(
  textTopOnPage: number,
  textHeight: number,
  windowHeight: number,
  percent: number,
): number {
  const readPixels = (textHeight * percent) / 100;
  return Math.max(0, Math.round(textTopOnPage + readPixels - windowHeight));
}
