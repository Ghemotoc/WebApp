/**
 * useReadingLook: what the chapter text looks like for this reader (story S1-E4-02).
 *
 * It joins the reader's saved settings (useReadingSettings) with the device's own text size,
 * read once when the chapter opens, and returns the values ChapterReading puts on the page: CSS
 * variables for the text, the column's width and the theme's box.
 * Who calls it: ChapterReading in ChapterReaderPage.
 * What it calls: useReadingSettings and lib/readingStyle.ts.
 */
import { useState, type CSSProperties } from 'react';

import type { ReadingTheme } from '../api/readingSettings';
import {
  deviceTextSize,
  readingColumnWidth,
  readingTextStyle,
  readRootFontSize,
} from '../lib/readingStyle';

import { useReadingSettings } from './useReadingSettings';

/** The theme's box around the text: its class and, for Night, the night tokens. */
export interface ReadingPage {
  className: string;
  dataTheme: 'night' | undefined;
}

/**
 * The box for a theme: none for Light, a rounded page for Sepia and Night.
 *
 * @param theme - the reader's theme
 * @returns the class and the data-theme value
 */
export function readingPageFor(theme: ReadingTheme): ReadingPage {
  if (theme === 'sepia')
    return { className: 'tmc-reading-page tmc-reading-page--sepia', dataTheme: undefined };
  if (theme === 'night') return { className: 'tmc-reading-page', dataTheme: 'night' };
  return { className: '', dataTheme: undefined };
}

/**
 * Works out the look.
 *
 * @returns textVariables (a style with the CSS variables), columnWidth (px), page (the theme's
 *   box), deviceSize (the size that follows the device) and isSignedIn
 */
export function useReadingLook() {
  const { settings, isSignedIn } = useReadingSettings();
  // The device's size is read once: it changes only when the reader changes their device setting.
  const [deviceSize] = useState(() => deviceTextSize(readRootFontSize()));
  const textStyle = readingTextStyle(settings, deviceSize);
  const textVariables = {
    '--reading-font-family': textStyle.fontFamily,
    '--reading-font-size': textStyle.fontSize,
    '--reading-line-height': String(textStyle.lineHeight),
    '--reading-letter-spacing': textStyle.letterSpacing,
  } as CSSProperties;
  return {
    textVariables,
    columnWidth: readingColumnWidth(settings.lineWidth),
    page: readingPageFor(settings.theme),
    deviceSize,
    isSignedIn,
  };
}
