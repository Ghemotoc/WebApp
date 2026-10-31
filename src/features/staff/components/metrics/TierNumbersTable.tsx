/**
 * TierNumbersTable: "Reports by tier" on the staff Metrics page (story S1-E11-04, criterion 1;
 * board AdminMetrics).
 *
 * One row per tier, most urgent first: its time limit, how many cases arrived in the counting
 * window, how many were handled within the limit and the share. A case counts once it is decided
 * or its limit has passed; one still inside its limit isn't measured yet. The line above the table
 * adds every tier together. On wide screens a real table; on phones label and value rows with a
 * fine line between them (DoD). Who shows it: MetricsOverviewSections.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { TierNumbers } from '../../api/metricsOverview';
import { shareInTime, tierTotals } from '../../lib/tierShares';

import { MetricsCard } from './MetricsCard';

/**
 * A tier's time limit as words: "1 hour", "24 hours", "7 days".
 *
 * @param hours - the limit in hours
 * @param t - the translator
 * @returns the text
 */
function limitText(hours: number, t: TFunction<'staff'>): string {
  if (hours >= 48 && hours % 24 === 0) return t('metrics.overview.days', { count: hours / 24 });
  return t('metrics.overview.hours', { count: hours });
}

/**
 * The rows as a table on wide screens and as label and value rows on phones.
 *
 * @param props.headings - the column headings
 * @param props.rows - each tier's key and cells, in column order
 * @returns the table and the phone list
 */
function TierRows({
  headings,
  rows,
}: {
  headings: string[];
  rows: { key: string; cells: string[] }[];
}) {
  return (
    <>
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-meta">
            {headings.map((heading) => (
              <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border align-top">
              {row.cells.map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 md:hidden">
        {rows.map((row) => (
          <li key={row.key} className="rounded-card border border-border p-4">
            <LabelRows
              rows={row.cells.map((cell, index) => ({
                label: headings[index] ?? '',
                value: cell,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Renders the card.
 *
 * @param props.tiers - from admin_metrics_overview(), most urgent first
 * @param props.windowDays - how many days of cases are counted
 * @returns the card
 */
export function TierNumbersTable({
  tiers,
  windowDays,
}: {
  tiers: TierNumbers[];
  windowDays: number;
}) {
  const { t } = useTranslation('staff');
  const totals = tierTotals(tiers);
  const totalShare = shareInTime(totals.inTime, totals.measured);
  const headings = ['tier', 'limit', 'cases', 'inTime', 'share'].map((key) =>
    t(`metrics.overview.tierColumns.${key}`),
  );
  const cellsOf = (tier: TierNumbers) => {
    const share = shareInTime(tier.inTime, tier.measured);
    return [
      t(`metrics.overview.tiers.${tier.tier}`),
      limitText(tier.hours, t),
      String(tier.cases),
      t('metrics.overview.inTimeOf', { inTime: tier.inTime, measured: tier.measured }),
      share === null ? t('metrics.overview.nothingToMeasure') : `${share}%`,
    ];
  };
  return (
    <MetricsCard
      headingId="metrics-tiers"
      eyebrow={t('metrics.overview.tiersEyebrow')}
      heading={t('metrics.overview.tiersHeading')}
      intro={t('metrics.overview.tiersIntro', { count: windowDays })}
      actions={
        <Link to="/staff/moderation" className="text-sm font-semibold text-link underline">
          {t('metrics.overview.queueLink')}
        </Link>
      }
    >
      <p className="m-0 font-heading text-[22px] font-bold text-heading">
        {totalShare === null
          ? t('metrics.overview.nothingToMeasure')
          : t('metrics.overview.tiersTotal', { share: totalShare, ...totals })}
      </p>
      <TierRows
        headings={headings}
        rows={tiers.map((tier) => ({ key: tier.tier, cells: cellsOf(tier) }))}
      />
    </MetricsCard>
  );
}
