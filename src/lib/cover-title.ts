/**
 * The size of a title we draw on a cover (story S1-E1-03; DoD design rules, covers).
 *
 * The rule: every cover where we draw the title shows the full title, with no ellipsis, line
 * clamp or clipping. Titles wrap on spaces and the size steps down with length: up to 18
 * characters the base size, 19 to 28 × 0.85, 29 to 40 × 0.72, longer × 0.62, never below 11 px.
 * Since CALM-4 the covers size their titles in cqi: coverTitleFit() also steps the size down until
 * the longest word and every line fit the cover.
 * Who calls it: DrawnCover (src/components/covers/DrawnCover.tsx), which every cover goes through
 * (S1-E3-01), and StoryCoverArt's paper label on a Picture cover.
 */

/** The smallest size a drawn cover title may use (DoD). */
export const MINIMUM_COVER_TITLE_SIZE = 11;

/**
 * Works out the font size for a title drawn on a cover.
 *
 * @param title - the full story title
 * @param baseSize - the size for short titles, in pixels (21 on shelf cards, per the boards)
 * @returns the font size in pixels, never below 11
 */
export function coverTitleSize(title: string, baseSize: number): number {
  const scale = coverTitleScale(title);
  return Math.max(MINIMUM_COVER_TITLE_SIZE, Math.round(baseSize * scale * 10) / 10);
}

/**
 * The step a title's size takes for its length, on its own (bundle CALM-4): the drawn covers set
 * it as --fit and the CSS multiplies their size in cqi by it (index.css, cover-label and friends),
 * so the same cover looks the same at every width.
 *
 * @param title - the full story title
 * @returns 1 up to 18 characters, 0.85 for 19 to 28, 0.72 for 29 to 40, 0.62 for longer ones
 */
export function coverTitleScale(title: string): number {
  const length = title.trim().length;
  if (length <= 18) return 1;
  if (length <= 28) return 0.85;
  if (length <= 40) return 0.72;
  return 0.62;
}

/** The three places a drawn cover sets its title (DrawnCover's looks; a Picture uses the label). */
export type CoverTitleLook = 'label' | 'big_title' | 'initial';

/** The four title fonts a writer can pick (CoverTitleFont in coverDesigns.ts). */
export type CoverTitleFontKey = 'reading' | 'display' | 'sans' | 'hand';

/**
 * The room each look gives its title, in cqi (1% of the cover's width; a 2:3 cover is 150 tall):
 * the title's base size and the width and height it may fill. They mirror index.css (cover-label,
 * cover-big, cover-initial): the label is 80.8 wide less 8 padding each side; Big title and
 * Initial are 100 wide less 10.4 each side. The heights leave room for the rule, the pen name and,
 * on Initial, the big letter.
 */
const roomForTitle: Record<CoverTitleLook, { baseSize: number; width: number; height: number }> = {
  label: { baseSize: 9, width: 64.8, height: 85 },
  big_title: { baseSize: 20, width: 79.2, height: 95 },
  initial: { baseSize: 12.5, width: 79.2, height: 62 },
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

/** A title's lines may be this tall (index.css, cover-words-title: line-height 1.05). */
const LINE_HEIGHT = 1.05;

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
 * It starts from the length step (coverTitleScale) and steps down until the longest word fits one
 * line and every line fits the room the look gives its title. The CSS multiplies the look's size
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

  // Step down from the length step, 0.02 at a time, until the title fits.
  let fit = coverTitleScale(title);
  while (fit > 0.3) {
    const size = room.baseSize * fit;
    const lineWidth = room.width / size;
    const longestFits = Math.max(...wordWidths) <= lineWidth;
    const height = linesFor(wordWidths, lineWidth, spaceWidth) * LINE_HEIGHT * size;
    if (longestFits && height <= room.height) return Math.round(fit * 100) / 100;
    fit -= 0.02;
  }
  return 0.3;
}
