/**
 * ChapterStatsTable: one story's numbers per chapter on the writer dashboard (story S1-E3-07;
 * board WriterDashboard 4.1, the table inside each "Story by story" card).
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): a plain table with no frame, the
 * columns Chapter, Status, Reads, Read-through, Likes and Comments (numbers on the right, in
 * figures of one width), the headers in 13 px semibold meta colour, a hairline between rows (DoD:
 * label rows), the status in words with its date under it (no pill), "not published" where a
 * draft or a scheduled chapter has no numbers, and the caption "Per chapter, all time…" under the
 * table as a meta line. The table scrolls sideways on small screens inside a labelled focusable
 * region, so a keyboard can scroll it too (WCAG 2.1.1).
 * Every count from fewer than 5 readers reads "fewer than 5" (criterion 2).
 * Who uses it: WriterStoryCard. Its rows come from useWriterDashboard (writer_dashboard()).
 */
import { useTranslation } from 'react-i18next';

import { formatLocalShortDate } from '@/lib/local-time';

import type { DashboardChapter } from '../api/dashboard';
import { dashboardChapterState } from '../lib/dashboardChapters';
import { formatShownCount, formatShownPercent } from '../lib/dashboardNumbers';

/**
 * The date under the status: when it went out, when it goes out, or when it was saved.
 *
 * @param chapter - the chapter's row
 * @param language - the interface language
 * @returns the date text, or null
 */
function stateDate(chapter: DashboardChapter, language: string): string | null {
  const moment = chapter.scheduledFor ?? chapter.firstPublishedAt ?? chapter.draftSavedAt;
  return moment === null ? null : formatLocalShortDate(new Date(moment), language);
}

/** The header cell style: 13 px semibold in the meta colour, over the table's one darker line. */
const headerCell = 'border-b border-border py-2 pr-3 type-meta leading-[18px] font-semibold';

/** A body cell: 12 px above and below, the hairline under it. */
const bodyCell = 'py-3 pr-3 align-top';

/** One chapter's row. */
function ChapterStatsRow({ chapter }: { chapter: DashboardChapter }) {
  const { t, i18n } = useTranslation('writing');
  const fewer = t('dashboard.fewerThanFive');
  const count = (value: number | null) => formatShownCount(value, i18n.language, fewer);
  const state = dashboardChapterState(chapter);
  const title = chapter.title === '' ? t('manageChapters.untitled') : chapter.title;
  const date = stateDate(chapter, i18n.language);
  return (
    <tr className="border-b border-hairline">
      <th scope="row" className={`${bodyCell} text-left font-semibold text-ink-heading`}>
        {t('dashboard.table.row', { number: chapter.position, title })}
      </th>
      <td className={bodyCell}>
        <span className="flex flex-col items-start">
          {t(`manageChapters.state.${state}`)}
          {date !== null && <span className="type-meta">{date}</span>}
        </span>
      </td>
      {state === 'published' ? (
        <>
          <td className={`${bodyCell} text-right`}>{count(chapter.reads)}</td>
          <td className={`${bodyCell} text-right`}>
            {formatShownPercent(chapter.readThrough, i18n.language, fewer)}
          </td>
          <td className={`${bodyCell} text-right`}>{count(chapter.likes)}</td>
          <td className={`${bodyCell} pr-0 text-right`}>{count(chapter.comments)}</td>
        </>
      ) : (
        <td colSpan={4} className={`${bodyCell} text-ink-muted`}>
          {t('dashboard.table.notPublished')}
        </td>
      )}
    </tr>
  );
}

/** What the table needs. */
export interface ChapterStatsTableProps {
  storyTitle: string;
  chapters: DashboardChapter[];
}

/**
 * Renders the table.
 *
 * @param props.storyTitle - for the region's name ("Numbers per chapter for …")
 * @param props.chapters - the story's chapters, in order
 * @returns the scrolling table
 */
export function ChapterStatsTable({ storyTitle, chapters }: ChapterStatsTableProps) {
  const { t } = useTranslation('writing');
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={t('dashboard.table.regionLabel', { title: storyTitle })}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[640px] caption-bottom border-collapse type-body leading-5 tabular-nums">
        <caption className="pt-3 text-left type-meta">{t('dashboard.table.caption')}</caption>
        <thead className="text-ink-muted">
          <tr>
            <th scope="col" className={`${headerCell} text-left`}>
              {t('dashboard.table.chapter')}
            </th>
            <th scope="col" className={`${headerCell} text-left`}>
              {t('dashboard.table.status')}
            </th>
            <th scope="col" className={`${headerCell} text-right`}>
              {t('dashboard.table.reads')}
            </th>
            <th scope="col" className={`${headerCell} text-right`}>
              {t('dashboard.table.readThrough')}
            </th>
            <th scope="col" className={`${headerCell} text-right`}>
              {t('dashboard.table.likes')}
            </th>
            <th scope="col" className={`${headerCell} pr-0 text-right`}>
              {t('dashboard.table.comments')}
            </th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((chapter) => (
            <ChapterStatsRow key={chapter.chapterCode} chapter={chapter} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
