/**
 * InvestorMonthCard: this month against last month, for each investor number, on the staff
 * Metrics page (story S1-E15-04, bundle ANALYTICS-1a).
 *
 * A table from 768 px; on phones each number is a small card of label and value rows, so nothing
 * scrolls sideways (CLAUDE.md rule 21). The full month-by-month history is in the spreadsheet.
 * Who shows it: InvestorNumbersSection. What it calls: lib/investorCsv.ts (monthChange).
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';

import type { InvestorMonth } from '../../api/investorNumbers';
import { monthChange } from '../../lib/investorCsv';

import { MetricsCard } from './MetricsCard';

/** The numbers compared, in order, and how each is read from a month. */
const comparedNumbers: { key: string; read: (month: InvestorMonth) => number | null }[] = [
  { key: 'signUps', read: (month) => month.signUps },
  { key: 'monthlyActive', read: (month) => month.monthlyActive },
  { key: 'averageDailyActive', read: (month) => month.averageDailyActive },
  { key: 'storiesRead', read: (month) => month.storiesRead },
  { key: 'chapterReads', read: (month) => month.chapterReads },
  { key: 'finishRate', read: (month) => month.finishRate },
  { key: 'hoursReading', read: (month) => Math.round(month.minutesReading / 6) / 10 },
  { key: 'hoursInApp', read: (month) => Math.round(month.minutesInApp / 6) / 10 },
  { key: 'writersPublishing', read: (month) => month.writersPublishing },
  { key: 'retention7', read: (month) => month.retentionDay7 },
];

/** One row's cells: the number's name, this month, last month and the change. */
type ComparedRow = { key: string; cells: [string, string, string, string] };

/**
 * The rows as a table on wide screens and as label and value rows on phones.
 *
 * @param props.headings - the four column headings
 * @param props.rows - the rows
 * @returns the table and the phone list
 */
function ComparedRows({ headings, rows }: { headings: string[]; rows: ComparedRow[] }) {
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
              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink">
                {row.cells[0]}
              </th>
              {row.cells.slice(1).map((cell, index) => (
                <td key={headings[index + 1]} className="py-2.5 pr-4 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 md:hidden">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-2 rounded-card border border-border p-4">
            <p className="m-0 text-sm font-semibold text-ink">{row.cells[0]}</p>
            <LabelRows
              rows={row.cells
                .slice(1)
                .map((cell, index) => ({ label: headings[index + 1] ?? '', value: cell }))}
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
 * @param props.months - oldest first; the last two are compared
 * @returns the card
 */
export function InvestorMonthCard({ months }: { months: InvestorMonth[] }) {
  const { t, i18n } = useTranslation('staff');
  const current = months.at(-1);
  const previous = months.at(-2);
  const shown = (value: number | null) =>
    value === null ? t('metrics.investor.notCounted') : value.toLocaleString(i18n.language);
  const change = (value: number | null) =>
    value === null
      ? t('metrics.investor.noChange')
      : t('metrics.investor.change', { sign: value > 0 ? '+' : '', value });
  const rows: ComparedRow[] = comparedNumbers.map((number) => {
    const now = current === undefined ? null : number.read(current);
    const before = previous === undefined ? null : number.read(previous);
    return {
      key: number.key,
      cells: [
        t(`metrics.investor.numbers.${number.key}`),
        shown(now),
        shown(before),
        change(monthChange(now, before)),
      ],
    };
  });
  const headings = ['number', 'thisMonth', 'lastMonth', 'change'].map((key) =>
    t(`metrics.investor.columns.${key}`),
  );
  return (
    <MetricsCard
      headingId="metrics-investor-months"
      eyebrow={t('metrics.investor.monthsEyebrow')}
      heading={t('metrics.investor.monthsHeading')}
      intro={t('metrics.investor.monthsIntro')}
    >
      <ComparedRows headings={headings} rows={rows} />
    </MetricsCard>
  );
}
