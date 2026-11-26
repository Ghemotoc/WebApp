/**
 * ChapterStats: the four numbers above the chapter list on a story's Chapters page (board D03,
 * user story 5.3; first built in G9d, story S1-E3-04): Chapters ("16 · 15 out, 1 draft"), Words
 * ("31.4k · 15 chapters out"), Reads ("18k · All time") and Status ("Completed · Chapter 15 is
 * the last").
 *
 * Each sits under a fine line, as the totals on Write (board D01): the label in the meta style,
 * the number in the heading font at 32/40, a line under it, 16 px apart (the board's `.stats`).
 * Words is written short ("31.4k") in the interface language's own style. Reads waits for the
 * writer dashboard's numbers and shows "fewer than 5" or a "+" where a chapter's count is hidden
 * (lib/chapterStats.ts).
 * It is a description list, so a screen reader pairs each number with its label.
 * Who uses it: ManageChaptersPage. What it calls: lib/chapterStats.ts.
 */
import { useTranslation } from 'react-i18next';

import type { ManagedChapter } from '../api/manageChapters';
import { chapterCounts, type ChapterCounts, type StoryReads } from '../lib/chapterStats';

/** One number: its label, the value and the line under it. */
interface StatContent {
  label: string;
  value: string;
  note: string;
}

/** What the row needs. */
export interface ChapterStatsProps {
  chapters: ManagedChapter[];
  /** The story's reads of all time; null while loading or before any chapter is out. */
  reads: StoryReads | null;
  completionStatus: 'ongoing' | 'completed';
}

/** One number under its fine line. */
function Stat({ stat }: { stat: StatContent }) {
  return (
    <div className="flex min-w-0 flex-col border-t border-hairline py-4">
      <dt className="type-meta">{stat.label}</dt>
      <dd className="m-0 font-heading type-title font-bold text-ink-heading">{stat.value}</dd>
      <dd className="m-0 type-meta">{stat.note}</dd>
    </div>
  );
}

/**
 * The line under Chapters: each state that has chapters ("15 out, 1 draft").
 *
 * @param t - the writing translations
 * @param counts - the chapters by state
 * @returns the line
 */
function chaptersNote(t: ReturnType<typeof useTranslation>['t'], counts: ChapterCounts): string {
  if (counts.total === 0) return t('manageChapters.stats.noChapters');
  const parts = [t('manageChapters.stats.out', { count: counts.published })];
  if (counts.drafts > 0) parts.push(t('manageChapters.stats.drafts', { count: counts.drafts }));
  if (counts.scheduled > 0) {
    parts.push(t('manageChapters.stats.scheduled', { count: counts.scheduled }));
  }
  if (counts.unpublished > 0) {
    parts.push(t('manageChapters.stats.unpublished', { count: counts.unpublished }));
  }
  return parts.join(', ');
}

/**
 * The words for Reads: a dash before anything is out, "fewer than 5", or the short total.
 *
 * @param t - the writing translations
 * @param reads - the story's reads, or null
 * @param compact - the short number format ("18k")
 * @returns the value
 */
function readsValue(
  t: ReturnType<typeof useTranslation>['t'],
  reads: StoryReads | null,
  compact: Intl.NumberFormat,
): string {
  if (reads === null) return '0';
  // Only hidden counts, all under five: say so rather than show a made-up floor.
  if (reads.isFloor && reads.atLeast < 5) return t('dashboard.fewerThanFive');
  const total = compact.format(reads.atLeast);
  return reads.isFloor ? `${total}+` : total;
}

/**
 * Renders the four numbers.
 *
 * @param props - the live chapters, the reads and the story's status
 * @returns the section with its description list
 */
export function ChapterStats({ chapters, reads, completionStatus }: ChapterStatsProps) {
  const { t, i18n } = useTranslation('writing');
  const counts = chapterCounts(chapters);
  // "31.4k" in English, "31,4 K" in Romanian: the language's own short form.
  const compact = new Intl.NumberFormat(i18n.language, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const stats: StatContent[] = [
    {
      label: t('manageChapters.stats.chapters'),
      value: String(counts.total),
      note: chaptersNote(t, counts),
    },
    {
      label: t('manageChapters.stats.words'),
      value: compact.format(counts.publishedWords),
      note:
        counts.published === 0
          ? t('manageChapters.stats.noneOut')
          : t('manageChapters.stats.chaptersOut', { count: counts.published }),
    },
    {
      label: t('manageChapters.stats.reads'),
      value: readsValue(t, reads, compact),
      note: t('manageChapters.stats.allTime'),
    },
    {
      label: t('manageChapters.stats.status'),
      value: t(`status.${completionStatus}`),
      note:
        counts.markedLastNumber === null
          ? t('manageChapters.stats.noLast')
          : t('manageChapters.stats.lastIs', { number: counts.markedLastNumber }),
    },
  ];
  return (
    <section aria-label={t('manageChapters.stats.label')}>
      <dl className="m-0 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Stat key={stat.label} stat={stat} />
        ))}
      </dl>
    </section>
  );
}
