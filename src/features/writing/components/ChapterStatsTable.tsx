/**
 * ChapterStatsTable: one story's numbers per chapter on the writer dashboard (story S1-E3-07;
 * board WriterDashboard 4.1, the table inside each "Story by story" card).
 *
 * Board values: a table inside a 16 px rounded frame with a fine border, the caption "Per chapter,
 * all time…", the columns Chapter, Status, Reads, Read-through, Likes and Comments (numbers on the
 * right), a fine line between rows (DoD: label rows), and "not published" where a draft or a
 * scheduled chapter has no numbers. The frame scrolls sideways on small screens and is a labelled
 * focusable region, so a keyboard can scroll it too (WCAG 2.1.1).
 * Every count from fewer than 5 readers reads "fewer than 5" (criterion 2). Every cell sits in the
 * row's vertical middle, so the status pill is centred, and the date under the pill stacks on its
 * own line with a 3 px gap (handoff, "Cards and status"; bundle G3 COMPONENTS).
 * Who uses it: WriterStoryCard. Its rows come from useWriterDashboard (writer_dashboard()).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { formatRomaniaShortDate } from '@/lib/romania-time';

import type { DashboardChapter } from '../api/dashboard';
import { dashboardChapterState, type DashboardChapterState } from '../lib/dashboardChapters';
import { formatShownCount, formatShownPercent } from '../lib/dashboardNumbers';

/** The pill tone for each state (the same as Manage chapters, board 4.4). */
const pillTones: Record<DashboardChapterState, PillTone> = {
  published: 'sage',
  draft: 'gold',
  scheduled: 'sky',
  unpublished: 'neutral',
};

/**
 * The date under the pill: when it went out, when it goes out, or when it was saved.
 *
 * @param chapter - the chapter's row
 * @param language - the interface language
 * @returns the date text, or null
 */
function stateDate(chapter: DashboardChapter, language: string): string | null {
  const moment = chapter.scheduledFor ?? chapter.firstPublishedAt ?? chapter.draftSavedAt;
  return moment === null ? null : formatRomaniaShortDate(new Date(moment), language);
}

/** The header cell style: small capitals in the meta colour. */
const headerCell =
  'border-b border-hairline px-3 py-3 text-xs font-bold tracking-[0.12em] uppercase';

/** One chapter's row. */
function ChapterStatsRow({ chapter }: { chapter: DashboardChapter }) {
  const { t, i18n } = useTranslation('writing');
  const fewer = t('dashboard.fewerThanFive');
  const count = (value: number | null) => formatShownCount(value, i18n.language, fewer);
  const state = dashboardChapterState(chapter);
  const title = chapter.title === '' ? t('manageChapters.untitled') : chapter.title;
  const date = stateDate(chapter, i18n.language);
  return (
    <tr className="border-b border-hairline last:border-b-0">
      <th scope="row" className="px-[18px] py-3.5 text-left align-middle font-semibold text-ink">
        {t('dashboard.table.row', { number: chapter.position, title })}
      </th>
      <td className="px-3 py-3.5 align-middle">
        <span className="flex flex-col items-start gap-[3px]">
          <InfoPill tone={pillTones[state]}>{t(`manageChapters.state.${state}`)}</InfoPill>
          {date !== null && <span className="text-[13px] text-meta">{date}</span>}
        </span>
      </td>
      {state === 'published' ? (
        <>
          <td className="px-3 py-3.5 text-right align-middle">{count(chapter.reads)}</td>
          <td className="px-3 py-3.5 text-right align-middle">
            {formatShownPercent(chapter.readThrough, i18n.language, fewer)}
          </td>
          <td className="px-3 py-3.5 text-right align-middle">{count(chapter.likes)}</td>
          <td className="px-[18px] py-3.5 text-right align-middle">{count(chapter.comments)}</td>
        </>
      ) : (
        <td colSpan={4} className="px-3 py-3.5 align-middle text-meta">
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
      className="overflow-x-auto rounded-2xl border border-hairline"
    >
      <table className="w-full min-w-[640px] border-collapse text-[15px]">
        <caption className="px-[18px] pt-3.5 pb-1 text-left text-[13px] text-meta">
          {t('dashboard.table.caption')}
        </caption>
        <thead className="text-meta">
          <tr>
            <th scope="col" className={`${headerCell} pl-[18px] text-left`}>
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
            <th scope="col" className={`${headerCell} pr-[18px] text-right`}>
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
