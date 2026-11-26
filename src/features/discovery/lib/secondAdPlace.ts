/**
 * secondAdPlace: where the Read page's second advert goes among its rows (user story 1.4, board
 * A04; the slot discover_card, made a wide banner by …_books_a04_read_second_ad.sql).
 *
 * Board A04 draws the second 728 × 90 banner between two genre rows, well below the first one
 * (which follows the first row, S1-E12-01). The rows come from the public setting
 * discover_shelves, which staff change without a release, so the place is worked out from the
 * rows this reader actually gets:
 * - with genre rows ("categories") after the first row, between the first and second genre;
 * - otherwise after the third row, but only when a fourth row follows, so the banner always sits
 *   between two rows and never ends the page or crowds the first banner.
 * Never more than two slots on a page (decided 17 Oct 2026, 11:53): this only places position 2.
 *
 * Who calls it: DiscoverPage (ShelfRows). It calls nothing.
 */

/** Where the second banner sits: inside the genre rows, after a row, or nowhere. */
export type SecondAdPlace =
  { kind: 'betweenGenres' } | { kind: 'afterRow'; index: number } | { kind: 'none' };

/** The row the banner follows when there are no genre rows: the third (counting from 0). */
const rowBeforeSecondAd = 2;

/**
 * Works out where the second banner goes.
 *
 * @param words - the words of discover_shelves this reader can get, in order
 * @returns the place; 'none' when the page is too short for a second banner
 */
export function secondAdPlace(words: readonly string[]): SecondAdPlace {
  // Step 1: genre rows after the first row: the banner goes between two genres, as drawn.
  // (Genre rows that are the first row already have the first banner right after them.)
  if (words.indexOf('categories') > 0) return { kind: 'betweenGenres' };
  // Step 2: otherwise after the third row, when another row follows it.
  if (words.length > rowBeforeSecondAd + 1) return { kind: 'afterRow', index: rowBeforeSecondAd };
  // Step 3: three rows or fewer: one banner is enough.
  return { kind: 'none' };
}
