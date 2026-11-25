/**
 * Turns the reader's settings into what the chapter text looks like (story S1-E4-02; board 3.5
 * Reader, "Reading settings").
 *
 * Board values: fonts Inter, a serif (Literata, the story font of the liquid glass design,
 * bundle G7d; Georgia before it loads), a dyslexia-friendly one (OpenDyslexic with a little extra
 * letter spacing; rulebook: "Dyslexia-friendly font = OpenDyslexic", G7d) and Atkinson
 * Hyperlegible (IDEAS-1 part a, IDEA-20261031-6). All are served from our own files in
 * src/styles/fonts.css, and a browser fetches a font's files only once text uses it. Text size
 * 14 to 28 px; line spacing 1.5, 1.7 or 2; line width about 560, 680 or 780 px. The simplified design
 * (CALM-5; handover Step 3, the reader) starts the text at 20 px (Literata 20/34) on wide screens
 * and 17 px (17/28) under 600 px; readers change it in Aa.
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
/** The reader's size at the browser's normal 16 px: 20 px from 600 px wide, 17 px on phones (CALM-5). */
const defaultTextSize = 20;
const defaultPhoneTextSize = 17;
/** Below this width the phone size applies (the paper's own phone breakpoint, index.css). */
const phoneWidth = 600;
const browserNormalSize = 16;

/** Each font's CSS family and letter spacing. */
const fontStyles: Record<ReadingFont, { family: string; letterSpacing: string }> = {
  sans: { family: 'var(--font-body)', letterSpacing: '0' },
  // Literata, the story font (tokens.css --font-story), with Georgia while it loads (G7d).
  serif: { family: 'var(--font-story)', letterSpacing: '0' },
  // OpenDyslexic's weighted letter bottoms and the extra spacing help many readers with dyslexia
  // (rulebook, G7d; tokens.css --font-dyslexia, which falls back to Comic Sans MS).
  dyslexia_friendly: { family: 'var(--font-dyslexia)', letterSpacing: '0.04em' },
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
 * @param windowWidth - the window's width in px, as phones start smaller (CALM-5)
 * @returns 20 px at 16 (17 px under 600 px wide), and the same share larger or smaller, from 14 to 28
 */
export function deviceTextSize(rootFontSize: number, windowWidth = phoneWidth): number {
  const startSize = windowWidth < phoneWidth ? defaultPhoneTextSize : defaultTextSize;
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) return startSize;
  return clampTextSize((startSize * rootFontSize) / browserNormalSize);
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
 * How wide the chapter column may grow: the text width alone. Since CALM-5 a paragraph's comment
 * count sits in the paper's right margin (wide screens) or on the paragraph's corner (phones), so
 * no column is kept free beside the text any more.
 *
 * @param lineWidth - the reader's line width
 * @returns the column's maximum width in px
 */
export function readingColumnWidth(lineWidth: ReadingLineWidth): number {
  return lineWidths[lineWidth];
}
