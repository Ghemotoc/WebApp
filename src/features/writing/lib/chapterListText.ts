/**
 * The words Manage chapters shows about each chapter: the list's summary ("6 published,
 * 1 draft, 1 scheduled") and each row's meta line (story S1-E3-04; board 4.4).
 *
 * Who calls it: ChapterListCard, ManagedChapterRow and RecentlyDeletedChapters.
 * What it calls: i18next's t() for the words (writing.json, manageChapters.*) and
 * src/lib/romania-time.ts for the dates, which are always Romania time in March
 * (decided 23 Oct 2026, Q7). Kept apart from the components so it can be tested on its own.
 */
import type { TFunction } from 'i18next';

import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { ManagedChapter, ManagedChapterState } from '../api/manageChapters';
import { purgeDateFor } from './purgeDate';

/** The order the board lists the counts in. */
const summaryOrder: ManagedChapterState[] = ['published', 'draft', 'scheduled', 'unpublished'];

/**
 * A short date in Romania time: "5 Sep" or "5 sept.".
 *
 * @param isoTime - the moment, as an ISO timestamp
 * @param language - the interface language
 * @returns the text
 */
export function shortRomaniaDate(isoTime: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    timeZone: 'Europe/Bucharest',
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoTime));
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

/** The published line, with the "Edited on" readers see when the text changed since. */
function publishedMeta(t: TFunction, chapter: ManagedChapter, language: string): string {
  const parts = [
    t('manageChapters.meta.published', {
      date: shortRomaniaDate(chapter.firstPublishedAt ?? '', language),
    }),
  ];
  if (chapter.editedAt !== null) {
    parts.push(
      t('manageChapters.meta.edited', { date: shortRomaniaDate(chapter.editedAt, language) }),
    );
  }
  return parts.join(' · ');
}

/** The draft line: "Draft · 228 words · saved 23 Oct". */
function draftMeta(t: TFunction, chapter: ManagedChapter, language: string): string {
  const parts = [
    t('manageChapters.meta.draft'),
    t('manageChapters.meta.words', { count: chapter.wordCount }),
  ];
  if (chapter.draftSavedAt !== null) {
    parts.push(
      t('manageChapters.meta.saved', { date: shortRomaniaDate(chapter.draftSavedAt, language) }),
    );
  }
  return parts.join(' · ');
}

/**
 * The line under a live chapter's title.
 *
 * @param t - the writing namespace's t()
 * @param chapter - the chapter
 * @param language - the interface language
 * @returns the line, for example "Goes live Saturday, 24 October at 18:00, Romania time"
 */
export function chapterMeta(t: TFunction, chapter: ManagedChapter, language: string): string {
  switch (chapter.state) {
    case 'published':
      return publishedMeta(t, chapter, language);
    case 'scheduled':
      return t('manageChapters.meta.scheduled', {
        when: formatRomaniaDateTime(new Date(chapter.scheduledFor ?? ''), language),
      });
    case 'unpublished':
      return [
        t('manageChapters.meta.unpublished', {
          date: shortRomaniaDate(chapter.unpublishedAt ?? '', language),
        }),
        t('manageChapters.meta.unpublishedNote'),
      ].join(' · ');
    case 'draft':
      return draftMeta(t, chapter, language);
  }
}

/**
 * The line under a deleted chapter: "Deleted 14 Oct · gone for good on 13 November 2026".
 *
 * @param t - the writing namespace's t()
 * @param deletedAt - when it was deleted
 * @param language - the interface language
 * @returns the line
 */
export function deletedMeta(t: TFunction, deletedAt: string, language: string): string {
  return t('manageChapters.deleted.meta', {
    date: shortRomaniaDate(deletedAt, language),
    purgeDate: purgeDateFor(deletedAt, language),
  });
}
