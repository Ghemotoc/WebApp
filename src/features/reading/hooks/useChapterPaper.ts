/**
 * useChapterPaper: the paper the open chapter shows, with Night by the clock (bundle IDEAS-1,
 * part a; idea IDEA-20261031-7; the Paper replaced the theme in BOOKS B04, user story 2.4).
 *
 * How:
 * - The clock is read once, when the chapter opens, and kept for that chapter, so the page and
 *   the panel agree and a chapter doesn't switch while it is read.
 * - A paper picked by hand in the panel while the clock decides the paper is kept for this
 *   chapter only, in a small store shared by the panel and the page, so "my choice wins until
 *   the next chapter". Outside the hours a pick is the reader's usual paper and is saved as before.
 * Who calls it: useReadingLook (the page) and ReadingSettingsPanel (the Paper choice).
 * What it calls: lib/nightByClock.ts.
 */
import { useSyncExternalStore } from 'react';

import type { ReadingPaper, ReadingSettings } from '../api/readingSettings';
import { chapterPaper, isNightByClockNow } from '../lib/nightByClock';

/** The one paper picked by hand, and the chapter it belongs to. */
let pickedByHand: { chapterCode: string; paper: ReadingPaper } | null = null;
/** When the open chapter was opened, on the device's clock. */
let opened: { chapterCode: string; at: Date } | null = null;
/** Who to tell when it changes. */
const listeners = new Set<() => void>();

/** Lets React follow the store. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps a paper picked by hand for one chapter.
 *
 * @param chapterCode - the open chapter
 * @param paper - the paper picked
 */
export function pickPaperForChapter(chapterCode: string, paper: ReadingPaper) {
  pickedByHand = { chapterCode, paper };
  for (const listener of listeners) listener();
}

/**
 * When a chapter was opened: the first time asked for that chapter, now.
 *
 * @param chapterCode - the open chapter
 * @returns the moment it opened
 */
function openedAtFor(chapterCode: string): Date {
  if (opened === null || opened.chapterCode !== chapterCode) {
    opened = { chapterCode, at: new Date() };
  }
  return opened.at;
}

/**
 * Follows the open chapter's paper.
 *
 * @param settings - the reader's settings
 * @param chapterCode - the open chapter
 * @returns paper (what the chapter shows) and isClockNight (true while the clock decides it)
 */
export function useChapterPaper(settings: ReadingSettings, chapterCode: string) {
  // Step 1: the device's clock when this chapter opened.
  const openedAt = openedAtFor(chapterCode);
  // Step 2: a pick made by hand in this chapter; a pick from another chapter no longer counts.
  const picked = useSyncExternalStore(
    subscribe,
    () => pickedByHand,
    () => null,
  );
  const pickedHere = picked !== null && picked.chapterCode === chapterCode ? picked.paper : null;
  return {
    paper: chapterPaper(settings, openedAt, pickedHere),
    isClockNight: isNightByClockNow(settings, openedAt),
  };
}
