/**
 * ChapterStats: the "This story in numbers" row on Manage chapters: how many chapters, how many
 * words and when the next scheduled chapter goes live (liquid glass Chapters board, bundle G9
 * WRITING, part d; story S1-E3-04).
 *
 * The board also shows reads; the chapter list doesn't carry reads (they live in the writer
 * dashboard's daily totals, S1-E3-07), so that tile is left out (docs/board-fixes.md).
 * It is a description list, so a screen reader pairs each number with its label.
 * Who uses it: ManageChaptersPage. What it calls: lib/chapterMoves.ts (storyNumbers) and
 * lib/chapterListText.ts (the short Romania-time date).
 */
import { useTranslation } from 'react-i18next';

import type { ManagedChapter } from '../api/manageChapters';
import { shortRomaniaDate } from '../lib/chapterListText';
import { storyNumbers } from '../lib/chapterMoves';

/** One tile: the big number and its label under it. */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[140px] flex-[1_1_140px] flex-col-reverse gap-1 rounded-2xl border border-border bg-surface px-5 py-4 shadow-card">
      <dt className="text-sm text-meta">{label}</dt>
      <dd className="m-0 font-heading text-[28px] leading-none font-bold text-heading">{value}</dd>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @param chapters - the story's live chapters
 * @returns the description list of tiles
 */
export function ChapterStats({ chapters }: { chapters: ManagedChapter[] }) {
  const { t, i18n } = useTranslation('writing');
  const numbers = storyNumbers(chapters);
  // Words in the interface language's style ("12,400" or "12.400").
  const format = new Intl.NumberFormat(i18n.language);
  const next =
    numbers.nextScheduledFor === null
      ? t('manageChapters.stats.noneScheduled')
      : shortRomaniaDate(numbers.nextScheduledFor, i18n.language);

  return (
    <section aria-label={t('manageChapters.stats.label')}>
      <dl className="m-0 flex flex-wrap gap-3">
        <StatTile
          value={format.format(numbers.chapterCount)}
          label={t('manageChapters.stats.chapters')}
        />
        <StatTile
          value={format.format(numbers.wordCount)}
          label={t('manageChapters.stats.words')}
        />
        <StatTile value={next} label={t('manageChapters.stats.nextChapter')} />
      </dl>
    </section>
  );
}
