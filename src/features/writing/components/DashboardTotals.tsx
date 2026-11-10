/**
 * DashboardTotals: "How readers respond", the five tiles at the top of the writer dashboard
 * (story S1-E3-07; board WriterDashboard 4.1, "Totals for all stories").
 *
 * Board values: an eyebrow, the 28 px heading, a "Last 30 days / All time" glass switch
 * (SegmentedControl, bundle G9 WRITING, part b), five tiles (24 px corners, the label in the
 * eyebrow style with a 20 px line icon beside it, the number in 40 px Funnel Display below, a 14 px
 * note) and the lilac "These are totals only" panel.
 * A count from fewer than 5 readers reads "fewer than 5" (criterion 2); the numbers are totals,
 * never a list of readers (criterion 3).
 * Who uses it: WriterDashboardTop. Its numbers come from useWriterDashboard (writer_dashboard()).
 */
import { useTranslation } from 'react-i18next';

import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { DashboardPeriod, WriterDashboard } from '../api/dashboard';
import { formatShownCount, formatShownPercent } from '../lib/dashboardNumbers';

/** One tile: label, value, icon and note. */
interface TileContent {
  label: string;
  value: string;
  icon: ActionIconName;
  note: string;
  /** True when the value is words ("fewer than 5"), which take a smaller size than a number. */
  isWords?: boolean;
}

/**
 * One tile, as the liquid glass Write board draws it (bundle G9 WRITING, part b): the label and a
 * small line icon share the top row, so the number below has the tile's whole width and words
 * such as "fewer than 5" don't squeeze beside an icon.
 */
function StatTile({ tile }: { tile: TileContent }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border border-border bg-surface px-[22px] py-5 shadow-card">
      <span className="flex items-center justify-between gap-2">
        <Eyebrow>{tile.label}</Eyebrow>
        <ActionIcon name={tile.icon} size={20} className="block flex-none text-heading" />
      </span>
      <span
        className={
          tile.isWords === true
            ? 'font-heading text-[26px] leading-tight font-extrabold text-ink'
            : 'font-heading text-[40px] leading-none font-extrabold tracking-[-0.02em] text-ink'
        }
      >
        {tile.value}
      </span>
      <span className="text-sm leading-[1.45] text-body">{tile.note}</span>
    </div>
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
    date: formatRomaniaDate(new Date(dashboard.firstPublishedAt), language),
  });
}

/**
 * The five tiles' words and numbers.
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
      icon: 'eye',
      note: readsNote(dashboard, language, t),
    },
    {
      label: t('dashboard.totals.readThrough'),
      value: formatShownPercent(totals.readThrough, language, fewer),
      icon: 'book',
      note: t('dashboard.totals.readThroughNote'),
    },
    {
      label: t('dashboard.totals.likes'),
      value: count(totals.likes),
      icon: 'heart',
      note: t('dashboard.totals.likesAcross', { count: totals.likedChapters }),
    },
    {
      label: t('dashboard.totals.comments'),
      value: count(totals.comments),
      icon: 'comment',
      note: t('dashboard.totals.commentsNote'),
    },
    {
      label: t('dashboard.totals.followers'),
      value: count(totals.followers),
      icon: 'people',
      note: t(isLast30 ? 'dashboard.totals.followersLast30' : 'dashboard.totals.followersNote'),
    },
  ];
  // A "fewer than 5" value is words, drawn smaller so it fits the tile.
  return tiles.map((tile) => ({ ...tile, isWords: tile.value === fewer }));
}

/** The lilac "These are totals only" panel (board, "Privacy rule for the numbers"). */
function TotalsOnlyNote() {
  const { t } = useTranslation('writing');
  return (
    <div className="mt-4 flex items-start gap-3.5 rounded-[20px] bg-tint px-5 py-4">
      <ActionIcon name="shield" size={24} className="mt-0.5 block flex-none text-heading" />
      <p className="m-0 text-[15px] leading-[1.6] text-ink">
        <strong className="font-bold">{t('dashboard.totals.privacyStrong')}</strong>{' '}
        {t('dashboard.totals.privacy')}
      </p>
    </div>
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
    <section aria-labelledby="dashboard-totals-heading" className="relative">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{t('dashboard.totals.eyebrow')}</Eyebrow>
          <h2
            id="dashboard-totals-heading"
            className="m-0 font-heading text-[28px] font-bold tracking-[-0.01em] text-heading"
          >
            {t('dashboard.totals.heading')}
          </h2>
        </div>
        {/* The board's glass switch: a radio group with the white bubble under the pick. */}
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </div>
      <TotalsOnlyNote />
    </section>
  );
}
