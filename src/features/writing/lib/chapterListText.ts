/**
 * The words the Chapters page shows about each chapter: the list's summary ("6 published,
 * 1 draft, 1 scheduled", read by screen readers), each row's meta line and each deleted row's
 * line (story S1-E3-04; board D03, user story 5.3, which turns the lines into MetaLine facts).
 *
 * GAPS-11 adds the note for a chapter whose number changed ("was chapter 13").
 *
 * Who calls it: ChapterList, ManagedChapterRow and RecentlyDeletedChapters.
 * What it calls: i18next's t() for the words (writing.json, manageChapters.*) and
 * src/lib/local-time.ts and src/lib/romania-time.ts for the dates and a scheduled chapter's
 * time, all on the writer's own clock (Robert, 20 Nov 2026, 18:19 and 18:36 UTC). Kept apart from the components so it can be tested on its own.
 */
import type { TFunction } from 'i18next';

import type { MetaFact } from '@/components/ui/MetaLine';
import { formatLocalDateTime, localDaysBetween } from '@/lib/local-time';
import { dateLocaleFor, withShortSeptember } from '@/lib/romania-time';

import type { ManagedChapter, ManagedChapterState } from '../api/manageChapters';
import { CONTENT_PURGE_DAYS } from './purgeDate';

/** The order the board lists the counts in. */
const summaryOrder: ManagedChapterState[] = ['published', 'draft', 'scheduled', 'unpublished'];

/**
 * A short date on the viewer's own calendar: "5 Sep" (British order) or "5 sept.".
 *
 * @param isoTime - the moment, as an ISO timestamp
 * @param language - the interface language
 * @returns the text
 */
export function shortLocalDate(isoTime: string, language: string): string {
  const text = new Intl.DateTimeFormat(dateLocaleFor(language), {
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoTime));
  return withShortSeptember(text);
}

/**
 * The list's heading: each state that has chapters, with its count. Published always shows,
 * as on the board ("0 published, 1 draft" for a story that isn't out yet).
 *
 * @param t - the writing namespace's t()
 * @param chapters - the live chapters
 * @returns for example "6 published, 1 draft, 1 scheduled"
 */
export function chapterSummary(t: TFunction, chapters: ManagedChapter[]): string {
  if (chapters.length === 0) return t('manageChapters.noChapters');
  const parts = summaryOrder.flatMap((state) => {
    const count = chapters.filter((chapter) => chapter.state === state).length;
    if (count === 0 && state !== 'published') return [];
    return [t(`manageChapters.summary.${state}`, { count })];
  });
  return parts.join(', ');
}

/** What a row's meta line needs besides the chapter. */
export interface RowFactOptions {
  /** The interface language. */
  language: string;
  /** The moment to count "today" from (the page passes new Date()). */
  now: Date;
  /** The chapter's likes from the writer dashboard; null when unknown or "fewer than 5". */
  likes: number | null;
}

/**
 * A day on the viewer's own calendar, as a row says it: "today" or "18 Sep".
 *
 * @param t - the writing namespace's t()
 * @param isoTime - the moment
 * @param options - the language and the moment to count from
 * @returns the words
 */
function dayText(t: TFunction, isoTime: string, options: RowFactOptions): string {
  if (localDaysBetween(new Date(isoTime), options.now) === 0) return t('manageChapters.row.today');
  return shortLocalDate(isoTime, options.language);
}

/** The facts only a published chapter has: the day, the "Edited on" readers see, its likes. */
function publishedFacts(t: TFunction, chapter: ManagedChapter, options: RowFactOptions) {
  const facts: MetaFact[] = [{ text: dayText(t, chapter.firstPublishedAt ?? '', options) }];
  if (chapter.editedAt !== null) {
    const date = shortLocalDate(chapter.editedAt, options.language);
    facts.push({ text: t('manageChapters.meta.edited', { date }) });
  }
  return facts;
}

/**
 * The facts that say when, for each state: the day it came out, when it goes live on the
 * writer's own clock (Robert, 20 Nov 2026, 18:19 UTC), when the draft was saved, or the day it
 * was taken back and what that means for readers.
 *
 * @param t - the writing namespace's t()
 * @param chapter - the chapter
 * @param options - the language and the moment to count from
 * @returns the facts after the state
 */
function whenFacts(t: TFunction, chapter: ManagedChapter, options: RowFactOptions): MetaFact[] {
  switch (chapter.state) {
    case 'published':
      return publishedFacts(t, chapter, options);
    case 'scheduled': {
      const when = formatLocalDateTime(new Date(chapter.scheduledFor ?? ''), options.language);
      return [{ text: t('manageChapters.row.goesLive', { when }) }];
    }
    case 'unpublished':
      return [
        { text: dayText(t, chapter.unpublishedAt ?? '', options) },
        { text: t('manageChapters.row.notOpen') },
        { text: t('manageChapters.row.commentsKept') },
      ];
    case 'draft':
      if (chapter.draftSavedAt === null) return [];
      return [
        {
          text: t('manageChapters.meta.saved', { date: dayText(t, chapter.draftSavedAt, options) }),
        },
      ];
  }
}

/**
 * The meta line under a live chapter's title (board D03, user story 5.3: "a row says what
 * readers know"): the state in bold, when, the words, then a move note, the likes and "the last
 * chapter" on the marked one. For example "Published · 9 Oct · 1,840 words · 212 likes · was
 * chapter 13".
 *
 * @param t - the writing namespace's t()
 * @param chapter - the chapter
 * @param options - the language, the moment to count from and the chapter's likes
 * @returns the facts, in reading order
 */
export function chapterRowFacts(
  t: TFunction,
  chapter: ManagedChapter,
  options: RowFactOptions,
): MetaFact[] {
  // Step 1: the state, then when, then the words.
  const facts: MetaFact[] = [
    { text: t(`manageChapters.state.${chapter.state}`), kind: 'state' },
    ...whenFacts(t, chapter, options),
    { text: t('manageChapters.meta.words', { count: chapter.wordCount }) },
  ];
  // Step 2: what only some chapters have.
  if (chapter.state === 'published' && options.likes !== null && options.likes > 0) {
    facts.push({ text: t('manageChapters.row.likes', { count: options.likes }) });
  }
  const movedNote = chapterMovedNote(t, chapter);
  if (movedNote !== null) facts.push({ text: movedNote });
  if (chapter.isMarkedLast) facts.push({ text: t('manageChapters.row.lastChapter') });
  return facts;
}

/**
 * The line under a deleted chapter (board D03): "Deleted 14 Oct · 27 days left".
 *
 * @param t - the writing namespace's t()
 * @param deletedAt - when it was deleted
 * @param options - the language and the moment to count from
 * @returns the two facts
 */
export function deletedFacts(
  t: TFunction,
  deletedAt: string,
  options: Pick<RowFactOptions, 'language' | 'now'>,
): MetaFact[] {
  const day = dayText(t, deletedAt, { ...options, likes: null });
  // The undo lasts CONTENT_PURGE_DAYS from the deletion; never fewer than 0 days.
  const daysGone = localDaysBetween(new Date(deletedAt), options.now);
  const daysLeft = Math.max(CONTENT_PURGE_DAYS - daysGone, 0);
  return [
    { text: t('manageChapters.deleted.deletedOn', { date: day }) },
    { text: t('manageChapters.deleted.daysLeft', { count: daysLeft }) },
  ];
}

/**
 * The note for a chapter whose number changed in the last 7 days (GAPS-11; liquid glass
 * Chapters board; board D03): "moved here from chapter 14" for the chapter the writer moved,
 * "was chapter 13" for one that shifted to make room, in lower case because it sits in the meta
 * line.
 *
 * @param t - the writing namespace's t()
 * @param chapter - the chapter as the list has it
 * @returns the note, or null when the chapter is where it was
 */
export function chapterMovedNote(t: TFunction, chapter: ManagedChapter): string | null {
  // No move on record, or the list already shows it back at its old number.
  if (chapter.wasPosition === null || chapter.wasPosition === chapter.position) return null;
  const key = chapter.wasPicked ? 'manageChapters.row.movedFrom' : 'manageChapters.row.wasChapter';
  return t(key, { number: chapter.wasPosition });
}
