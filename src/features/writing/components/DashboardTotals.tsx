/**
 * DashboardTotals: "How readers respond", the five figures on the glass hero at the top of the writer dashboard
 * (story S1-E3-07; board WriterDashboard 4.1, "Totals for all stories").
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): the page's one glass hero
 * (`Hero`), with the heading and the "Last 30 days / All time" switch (SegmentedControl) on one
 * line, then five figures in a row (two a line on phones), each under a 2 px thread line: a label,
 * the number in 32/38 Funnel Display and a meta line; then "These are totals only" as a meta line.
 * No tiles, icons or eyebrows.
 * A count from fewer than 5 readers reads "fewer than 5" (criterion 2); the numbers are totals,
 * never a list of readers (criterion 3).
 * Who uses it: WriterDashboardTop. Its numbers come from useWriterDashboard (writer_dashboard()).
 */
import { useTranslation } from 'react-i18next';

import { Hero } from '@/components/ui/Hero';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatLocalDate } from '@/lib/local-time';

import type { DashboardPeriod, WriterDashboard } from '../api/dashboard';
import { formatShownCount, formatShownPercent } from '../lib/dashboardNumbers';

/** One figure: label, value and note. */
interface TileContent {
  label: string;
  value: string;
  note: string;
  /** True when the value is words ("fewer than 5"), which take a smaller size than a number. */
  isWords?: boolean;
}

/**
 * One figure: its label, the number (words such as "fewer than 5" a size smaller) and the note,
 * under the thread line.
 *
 * @param props.tile - the figure
 * @returns one list item
 */
function StatTile({ tile }: { tile: TileContent }) {
  return (
    <li className="flex min-w-0 flex-col gap-0.5 border-t-2 border-thread pt-3">
      <span className="text-sm font-semibold text-heading">{tile.label}</span>
      <span
        className={
          tile.isWords === true
            ? 'font-heading text-[22px] leading-[30px] font-bold text-heading'
            : 'font-heading text-[32px] leading-[38px] font-bold text-heading'
        }
      >
        {tile.value}
      </span>
      <span className="type-meta">{tile.note}</span>
    </li>
  );
}

/**
 * The note under Reads: since when (all time) or the last 30 days.
 *
 * @param dashboard - the numbers
 * @param language - the interface language
 * @param t - the writing translations
 * @returns the note
 */
function readsNote(
  dashboard: WriterDashboard,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (dashboard.period === 'last_30_days') return t('dashboard.totals.readsLast30');
  if (dashboard.firstPublishedAt === null) return t('dashboard.totals.readsNone');
  return t('dashboard.totals.readsSince', {
    date: formatLocalDate(new Date(dashboard.firstPublishedAt), language),
  });
}

/**
 * The five figures' words and numbers.
 *
 * @param dashboard - the numbers
 * @param language - the interface language
 * @param t - the writing translations
 * @returns the tiles, in the board's order
 */
function tilesFor(
  dashboard: WriterDashboard,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): TileContent[] {
  const fewer = t('dashboard.fewerThanFive');
  const { totals } = dashboard;
  const count = (value: number | null) => formatShownCount(value, language, fewer);
  const isLast30 = dashboard.period === 'last_30_days';
  const tiles: TileContent[] = [
    {
      label: t('dashboard.totals.reads'),
      value: count(totals.reads),
      note: readsNote(dashboard, language, t),
    },
    {
      label: t('dashboard.totals.readThrough'),
      value: formatShownPercent(totals.readThrough, language, fewer),
      note: t('dashboard.totals.readThroughNote'),
    },
    {
      label: t('dashboard.totals.likes'),
      value: count(totals.likes),
      note: t('dashboard.totals.likesAcross', { count: totals.likedChapters }),
    },
    {
      label: t('dashboard.totals.comments'),
      value: count(totals.comments),
      note: t('dashboard.totals.commentsNote'),
    },
    {
      label: t('dashboard.totals.followers'),
      value: count(totals.followers),
      note: t(isLast30 ? 'dashboard.totals.followersLast30' : 'dashboard.totals.followersNote'),
    },
  ];
  // A "fewer than 5" value is words, drawn smaller so it fits the tile.
  return tiles.map((tile) => ({ ...tile, isWords: tile.value === fewer }));
}

/** "These are totals only" as a meta line under the figures (board, "Privacy rule for the numbers"). */
function TotalsOnlyNote() {
  const { t } = useTranslation('writing');
  return (
    <p className="m-0 max-w-[90ch] type-meta">
      <strong className="font-semibold text-heading">{t('dashboard.totals.privacyStrong')}</strong>{' '}
      {t('dashboard.totals.privacy')}
    </p>
  );
}

/** What the section needs. */
export interface DashboardTotalsProps {
  dashboard: WriterDashboard;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

/**
 * Renders the section.
 *
 * @param props.dashboard - the numbers
 * @param props.period - the chosen period (it can run ahead of the numbers while they load)
 * @param props.onPeriodChange - called with the newly chosen period
 * @returns the section
 */
export function DashboardTotals({ dashboard, period, onPeriodChange }: DashboardTotalsProps) {
  const { t, i18n } = useTranslation('writing');
  const tiles = tilesFor(dashboard, i18n.language, t);
  return (
    <Hero labelledBy="dashboard-totals-heading" className="gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id="dashboard-totals-heading" className="m-0 type-heading text-heading">
          {t('dashboard.totals.heading')}
        </h2>
        <SegmentedControl
          legend={t('dashboard.totals.periodLabel')}
          isLegendVisible={false}
          name="dashboard-period"
          options={[
            { value: 'last_30_days', label: t('dashboard.totals.last30Days') },
            { value: 'all', label: t('dashboard.totals.allTime') },
          ]}
          value={period}
          onChange={onPeriodChange}
        />
      </div>
      {/* Five figures in a row from 1024 px, two a line on phones (board New-Write). */}
      <ul className="m-0 grid list-none grid-cols-2 gap-6 p-0 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </ul>
      <TotalsOnlyNote />
    </Hero>
  );
}
