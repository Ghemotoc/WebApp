/**
 * chapterPlace: the words for where a chapter stands in its story, "Chapter 14 of 15" or
 * "Chapter 14", and for when the next one comes out (bundle CALM-6; design handover "The last
 * chapter", "What readers see").
 *
 * Why two forms: readers see "of 15" only once the writer has marked a chapter as the last
 * (Robert's decision card "A switch when publishing", 20 Nov 2026, 12:43 UTC); until then the
 * app doesn't know how many chapters the story will have, so it says the number only.
 * Who calls it: ChapterBar, ChapterReaderHeader, ChapterNavigation, ChapterEnd, AboutThisStory
 * and the story page's chapter meta line.
 * What it calls: chapterDayWording() in src/lib/local-time.ts for the day.
 */
import type { TFunction } from 'i18next';

import { chapterDayWording } from '@/lib/local-time';

import type { NextChapter } from '../api/chapter';

/**
 * "Chapter 14 of 15" while a last chapter is marked, "Chapter 14" otherwise.
 *
 * @param t - the reading namespace's translate function
 * @param number - the chapter's number
 * @param lastChapterNumber - the marked last chapter's number, or null
 * @returns the text
 */
export function chapterPlaceText(
  t: TFunction<'reading'>,
  number: number,
  lastChapterNumber: number | null,
): string {
  if (lastChapterNumber === null) return t('reader.kickerNumberOnly', { number });
  return t('reader.kicker', { number, total: lastChapterNumber });
}

/**
 * "Next chapter Thursday", or "Last chapter Thursday" when the next one is the marked last.
 *
 * @param t - the reading namespace's translate function
 * @param nextChapter - the next scheduled chapter, or null
 * @param language - the interface language
 * @param now - the moment to count from
 * @returns the text, or null when no chapter is scheduled (the line then doesn't show)
 */
export function nextChapterText(
  t: TFunction<'reading'>,
  nextChapter: NextChapter | null,
  language: string,
  now: Date,
): string | null {
  if (nextChapter === null) return null;
  // Step 1: the day, in the viewer's own calendar (Robert, 20 Nov 2026, 18:19 UTC).
  const wording = chapterDayWording(new Date(nextChapter.scheduledFor), now, language);
  let day: string;
  if (wording.kind === 'weekday')
    day = t('reader.chapterDay.weekday', { weekday: wording.weekday });
  else if (wording.kind === 'date') day = t('reader.chapterDay.date', { date: wording.date });
  else day = t(`reader.chapterDay.${wording.kind}`);
  // Step 2: the line, naming the last chapter when it is the one coming.
  return nextChapter.isLast
    ? t('reader.lastChapterDay', { day })
    : t('reader.nextChapterDay', { day });
}
