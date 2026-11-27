/**
 * The size of a title we draw on a cover (story S1-E1-03; DoD design rules, covers).
 *
 * The rule: every cover where we draw the title shows the full title, with no ellipsis, line
 * clamp or clipping. Titles wrap on spaces and keep their look's one size whatever their length;
 * a title shrinks only when it would run past the room its look gives it (on a Label cover, the
 * label may grow down to 12% from the cover's bottom), and then just enough to fit, never below
 * 11 px (Robert, DESIGN card, 26 Nov 2026, 21:07 UTC: titles no longer change size with length;
 * it replaces the length steps of 16 Oct 2026). The covers size their titles in cqi, and
 * coverTitleFit() works out how far a title must shrink.
 * Who calls it: DrawnCover (src/components/covers/DrawnCover.tsx), which every cover goes through
 * (S1-E3-01), and StoryCoverArt's paper label on a Picture cover.
 */

/** The smallest size a drawn cover title may use (DoD). */
export const MINIMUM_COVER_TITLE_SIZE = 11;

/**
 * Works out the font size for a title drawn on a cover outside the browser's cover box (the EPUB
 * picture): the base size, shrunk only as far as the caller's fits() check needs.
 *
 * @param baseSize - the look's one size, in pixels
 * @param fits - says whether the title fits its room at a given size
 * @returns the font size in pixels, never below 11
 */
export function coverTitleSize(baseSize: number, fits: (size: number) => boolean): number {
  // Step down a pixel at a time from the one size, only while the title is too big for its room.
  let size = baseSize;
  while (size > MINIMUM_COVER_TITLE_SIZE && !fits(size)) size -= 1;
  return Math.max(MINIMUM_COVER_TITLE_SIZE, size);
}

/** The three places a drawn cover sets its title (DrawnCover's looks; a Picture uses the label). */
export type CoverTitleLook = 'label' | 'big_title' | 'initial';

/** The four title fonts a writer can pick (CoverTitleFont in coverDesigns.ts). */
export type CoverTitleFontKey = 'reading' | 'display' | 'sans' | 'hand';

/**
 * The room each look gives its title, in cqi (1% of the cover's width; a 2:3 cover is 150 tall):
 * the title's one size, the width and height it may fill and its line height. They mirror
 * index.css (cover-label, cover-big, cover-initial).
 * - Label: 80.8 wide less 8 padding each side. The label starts 12% from the top (18) and may
 *   grow down to 12% from the bottom (132), so it is at most 114 tall; less 9 padding top and
 *   bottom and the pen name (6 margin and 5.5 × 1.2 line), the title has about 83 (Robert, DESIGN
 *   card, 26 Nov 2026, 21:07 UTC). Its lines are 1.15 tall.
 * - Big title and Initial: 100 wide less 10.4 each side; the heights leave room for the rule, the
 *   pen name and, on Initial, the big letter. Their lines are 1.05 tall.
 */
const roomForTitle: Record<
  CoverTitleLook,
  { baseSize: number; width: number; height: number; lineHeight: number }
> = {
  label: { baseSize: 9, width: 64.8, height: 83, lineHeight: 1.15 },
  big_title: { baseSize: 20, width: 79.2, height: 95, lineHeight: 1.05 },
  initial: { baseSize: 12.5, width: 79.2, height: 62, lineHeight: 1.05 },
};

/**
 * How wide one letter is in each font, in em: lower case and capitals. Measured in Chromium on
 * 20 Nov 2026 (CALM-4 break test) on wide words such as "Neîmblânzitele" and "MAMMOTH", then
 * rounded up, so the estimate errs on the small side.
 */
const letterWidths: Record<CoverTitleFontKey, { lower: number; upper: number }> = {
  reading: { lower: 0.56, upper: 0.82 },
  display: { lower: 0.53, upper: 0.78 },
  sans: { lower: 0.53, upper: 0.78 },
  hand: { lower: 0.64, upper: 1.1 },
};

/** A little extra width per word, for kerning and the measurement's rounding. */
const SAFETY = 1.08;

/**
 * Estimates how wide a word is, in em.
 *
 * @param word - one word of the title
 * @param font - the title font
 * @returns the width in em
 */
function wordWidthInEm(word: string, font: CoverTitleFontKey): number {
  const widths = letterWidths[font];
  let total = 0;
  // Capitals are wider than lower-case letters, so count them apart.
  for (const letter of Array.from(word)) {
    const isCapital = letter !== letter.toLowerCase();
    total += isCapital ? widths.upper : widths.lower;
  }
  return total * SAFETY;
}

/**
 * Counts the lines a title takes when it wraps on spaces at a given line width.
 *
 * @param wordWidths - each word's width in em
 * @param lineWidth - the line's width in em
 * @param spaceWidth - a space's width in em
 * @returns the number of lines
 */
function linesFor(wordWidths: number[], lineWidth: number, spaceWidth: number): number {
  let lines = 1;
  let used = 0;
  for (const width of wordWidths) {
    // The word fits after a space on this line, or it starts the next one.
    const needed = used === 0 ? width : used + spaceWidth + width;
    if (needed <= lineWidth || used === 0) {
      used = needed;
    } else {
      lines += 1;
      used = width;
    }
  }
  return lines;
}

/**
 * The step a title's size takes so the whole title fits its cover (CALM-4 break test, 20 Nov
 * 2026: one long word such as "Neîmblânzitele" ran past the edge of a Big title or Initial cover,
 * and a long title pushed the pen name off the foot of a Big title cover).
 *
 * It starts from 1, the look's one size whatever the title's length, and steps down only until
 * the longest word fits one line and every line fits the room the look gives its title (Robert,
 * DESIGN card, 26 Nov 2026, 21:07 UTC). The CSS multiplies the look's size
 * by it (--fit) and still never goes below 11 px; past that, a word too long for the line breaks
 * (overflow-wrap in index.css) rather than being cut off.
 *
 * @param title - the full story title
 * @param look - where the cover sets its title
 * @param font - the title font
 * @returns the multiplier, between 0.3 and 1
 */
export function coverTitleFit(
  title: string,
  look: CoverTitleLook,
  font: CoverTitleFontKey,
): number {
  const room = roomForTitle[look];
  const wordWidths = title
    .trim()
    .split(/\s+/)
    .map((word) => wordWidthInEm(word, font));
  const spaceWidth = letterWidths[font].lower * 0.5;

  // Step down from the one size, 0.02 at a time, only while the title doesn't fit.
  let fit = 1;
  while (fit > 0.3) {
    const size = room.baseSize * fit;
    const lineWidth = room.width / size;
    const longestFits = Math.max(...wordWidths) <= lineWidth;
    const height = linesFor(wordWidths, lineWidth, spaceWidth) * room.lineHeight * size;
    if (longestFits && height <= room.height) return Math.round(fit * 100) / 100;
    fit -= 0.02;
  }
  return 0.3;
}
