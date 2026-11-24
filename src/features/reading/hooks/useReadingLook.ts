/**
 * useReadingLook: what the chapter text looks like for this reader (story S1-E4-02).
 *
 * It joins the reader's saved settings (useReadingSettings) with the device's own text size,
 * read once when the chapter opens, and returns the values ChapterReading puts on the page: CSS
 * variables for the text, the column's width and the paper's box. The paper is the chapter's
 * (useChapterPaper), so Night by the clock and a paper picked by hand apply (IDEAS-1 part a;
 * BOOKS B04).
 * Who calls it: ChapterReading in ChapterReaderPage.
 * What it calls: useReadingSettings, useChapterPaper and lib/readingStyle.ts.
 */
import { useState, type CSSProperties } from 'react';

import type { ReadingPaper } from '../api/readingSettings';
import {
  deviceTextSize,
  readingColumnWidth,
  readingTextStyle,
  readRootFontSize,
} from '../lib/readingStyle';

import { useChapterPaper } from './useChapterPaper';
import { useReadingSettings } from './useReadingSettings';

/** The paper's box around the text: its class and, for Black, the night tokens. */
export interface ReadingPage {
  className: string;
  dataTheme: 'night' | undefined;
}

/**
 * The box for a paper (BOOKS B04, board B04-ReaderSettings; colours from DESIGN, 24 Nov 2026):
 * every paper is a rounded sheet (index.css, tmc-reading-page). Sepia is the story paper
 * (#FFFBF2), White and Grey their own sheets (#FFFFFF, #EDEDED) with the paper ink, and Black the
 * story paper inside the night tokens, so it is the dark paper (#1A1A1C) with light text. With the
 * site's Night mode on, White, Sepia and Grey turn dark too ("Turns the whole page dark, paper
 * included"), because their own colours apply by day only.
 *
 * @param paper - the chapter's paper
 * @returns the class and the data-theme value
 */
export function readingPageFor(paper: ReadingPaper): ReadingPage {
  if (paper === 'black') {
    return { className: 'tmc-reading-page tmc-reading-page--paper', dataTheme: 'night' };
  }
  return { className: `tmc-reading-page tmc-reading-page--${paper}`, dataTheme: undefined };
}

/**
 * Works out the look.
 *
 * @param chapterCode - the open chapter, whose paper may come from the clock or a pick by hand
 * @returns textVariables (a style with the CSS variables), columnWidth (px), page (the paper's
 *   box), deviceSize (the size that follows the device), isSignedIn and hasRuler (the reading
 *   ruler is on) and timeLeft (where the minutes left show, CALM-5)
 */
export function useReadingLook(chapterCode: string) {
  const { settings, isSignedIn } = useReadingSettings();
  const { paper } = useChapterPaper(settings, chapterCode);
  // The device's size is read once: it changes only when the reader changes their device setting.
  // Phones start at 17 px and wider windows at 20 px (CALM-5, handover Step 3).
  const [deviceSize] = useState(() => deviceTextSize(readRootFontSize(), window.innerWidth));
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
    page: readingPageFor(paper),
    deviceSize,
    isSignedIn,
    hasRuler: settings.readingRuler,
    // Where the minutes left show (CALM-5): the bar unless the reader picked On the page.
    timeLeft: settings.timeLeft,
  };
}
