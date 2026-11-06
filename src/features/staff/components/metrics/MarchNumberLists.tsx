/**
 * MarchNumberLists: the two lists under the target cards on the staff Metrics page (story
 * S1-E15-02; board AdminMetrics): writers who published, by market, and chapter reads per day.
 *
 * The board draws reads per day as a chart; here it is a list of days and numbers (a label and
 * value list with a line between rows, DoD), so every number is real text a screen reader reads
 * (docs/board-fixes.md). Totals only: no row is about a person.
 * Who uses it: MarchNumbersPage.
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';
import { formatRomaniaShortDate } from '@/lib/romania-time';

import type { DayReads, MarketWriters } from '../../api/marchNumbers';

import { marketName } from '../../lib/marchNumbers';

/**
 * One list with its heading, or a line saying it is empty.
 *
 * @param props.headingId - links the heading to the section
 * @returns the section
 */
function NumberSection({
  headingId,
  eyebrow,
  heading,
  rows,
  emptyText,
}: {
  headingId: string;
  eyebrow: string;
  heading: string;
  rows: { label: string; value: string }[];
  emptyText: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={headingId} className="m-0 font-heading text-[22px] font-bold text-heading">
        {heading}
      </h2>
      {rows.length === 0 ? <p className="m-0 text-meta">{emptyText}</p> : <LabelRows rows={rows} />}
    </section>
  );
}

/**
 * Renders both lists.
 *
 * @param props.writersByMarket - from admin_march_numbers()
 * @param props.readsPerDay - from admin_march_numbers(), oldest first
 * @returns the two sections
 */
export function MarchNumberLists({
  writersByMarket,
  readsPerDay,
}: {
  writersByMarket: MarketWriters[];
  readsPerDay: DayReads[];
}) {
  const { t, i18n } = useTranslation('staff');
  // Newest day first, so today's number is at the top.
  const dayRows = [...readsPerDay].reverse().map((day) => ({
    label: formatRomaniaShortDate(new Date(`${day.day}T12:00:00Z`), i18n.language),
    value: day.reads.toLocaleString(i18n.language),
  }));
  const marketRows = writersByMarket.map((row) => ({
    label: marketName(row.market, i18n.language, t('metrics.otherMarkets')),
    value: row.count.toLocaleString(i18n.language),
  }));
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <NumberSection
        headingId="metrics-markets"
        eyebrow={t('metrics.marketsEyebrow')}
        heading={t('metrics.marketsHeading')}
        rows={marketRows}
        emptyText={t('metrics.noneYet')}
      />
      <NumberSection
        headingId="metrics-reads"
        eyebrow={t('metrics.readsEyebrow')}
        heading={t('metrics.readsHeading')}
        rows={dayRows}
        emptyText={t('metrics.noneYet')}
      />
    </div>
  );
}
