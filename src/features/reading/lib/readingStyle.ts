/**
 * Turns the reader's settings into what the chapter text looks like (story S1-E4-02; board 3.5
 * Reader, "Reading settings").
 *
 * Board values: fonts Inter, a serif (Georgia), a dyslexia-friendly one (Verdana with a
 * little extra letter spacing) and Atkinson Hyperlegible (IDEAS-1 part a, IDEA-20261031-6,
 * served from our own files in src/styles/fonts.css); text size 14 to 28 px, 19 px by default; line spacing 1.5, 1.7
 * or 2; line width about 560, 680 or 780 px.
 * The device's own text size (S1-E4-02, third criterion): browsers and phones that make text
 * larger raise the page's root font size above 16 px, so the default 19 px grows by the same
 * share until the reader picks a size of their own.
 * Who calls it: ChapterReading in ChapterReaderPage and the settings panel's size label.
 * What it calls: nothing; plain values, tested in readingStyle.test.ts.
 */
import type {
  ReadingFont,
  ReadingLineSpacing,
  ReadingLineWidth,
  ReadingSettings,
} from '../api/readingSettings';

/** The board's slider. */
export const smallestTextSize = 14;
export const largestTextSize = 28;
/** The reader's size at the browser's normal 16 px. */
const defaultTextSize = 19;
const browserNormalSize = 16;

/** Each font's CSS family and letter spacing. */
const fontStyles: Record<ReadingFont, { family: string; letterSpacing: string }> = {
  sans: { family: 'var(--font-body)', letterSpacing: '0' },
  serif: { family: "Georgia, 'Times New Roman', serif", letterSpacing: '0' },
  // Verdana's wide letters and the extra spacing help many readers with dyslexia (board 3.5).
  dyslexia_friendly: { family: 'Verdana, var(--font-body), sans-serif', letterSpacing: '0.04em' },
  // Made by the Braille Institute so letters that look alike (I, l, 1; O, 0) are easy to tell apart.
  atkinson_hyperlegible: {
    family: "'Atkinson Hyperlegible', var(--font-body), sans-serif",
    letterSpacing: '0',
  },
};

/** Line height for each spacing. */
const lineHeights: Record<ReadingLineSpacing, number> = { compact: 1.5, normal: 1.7, wide: 2 };

/** Text column width in px for each line width. */
const lineWidths: Record<ReadingLineWidth, number> = { narrow: 560, medium: 680, wide: 780 };

/**
 * Keeps a size inside the slider's range.
 *
 * @param size - any size in px
 * @returns the size, rounded, from 14 to 28
 */
export function clampTextSize(size: number): number {
  return Math.min(largestTextSize, Math.max(smallestTextSize, Math.round(size)));
}

/**
 * The size that follows the device's text setting.
 *
 * @param rootFontSize - the page's root font size in px (16 unless the device enlarges text)
 * @returns 19 px at 16, and the same share larger or smaller, from 14 to 28
 */
export function deviceTextSize(rootFontSize: number): number {
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) return defaultTextSize;
  return clampTextSize((defaultTextSize * rootFontSize) / browserNormalSize);
}

/**
 * Reads the page's root font size from the browser.
 *
 * @returns the size in px, or 16 when it can't be read
 */
export function readRootFontSize(): number {
  const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(rootSize) ? rootSize : browserNormalSize;
}

/** The text's look, ready for a style attribute. */
export interface ReadingTextStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
  letterSpacing: string;
}

/**
 * The chapter text's look for a set of settings.
 *
 * @param settings - the reader's settings
 * @param sizeFromDevice - the size to use when the reader has not picked one
 * @returns the CSS values for the text
 */
export function readingTextStyle(
  settings: ReadingSettings,
  sizeFromDevice: number,
): ReadingTextStyle {
  const font = fontStyles[settings.font];
  const size = settings.textSize ?? sizeFromDevice;
  return {
    fontFamily: font.family,
    fontSize: `${size}px`,
    lineHeight: lineHeights[settings.lineSpacing],
    letterSpacing: font.letterSpacing,
  };
}

/**
 * How wide the chapter column may grow: the text width plus the board's 80 px right-hand column
 * kept free for paragraph comment markers.
 *
 * @param lineWidth - the reader's line width
 * @returns the column's maximum width in px
 */
export function readingColumnWidth(lineWidth: ReadingLineWidth): number {
  return lineWidths[lineWidth] + 80;
}
