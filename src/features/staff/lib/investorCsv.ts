/**
 * The investor numbers as spreadsheet files, and the month-on-month change (story S1-E15-04,
 * bundle ANALYTICS-1a).
 *
 * Who calls it: components/metrics/InvestorNumbersSection.tsx. Tested in investorCsv.test.ts.
 * Every cell is a total; no file names a person.
 */
import type { InvestorDayNumber, InvestorMonth } from '../api/investorNumbers';

import { csvCell } from './auditLogCsv';

/** One column: the key in the data and the heading the reader sees. */
export interface CsvColumn<Key extends string> {
  key: Key;
  label: string;
}

/**
 * The change from one month to the next, in per cent.
 *
 * @param current - this month's number
 * @param previous - last month's number
 * @returns the rounded change, or null when either is missing or last month was 0
 */
export function monthChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * A number as a cell: empty when it is missing.
 *
 * @param value - the number
 * @returns the cell text
 */
function numberCell(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * The months as a CSV file, one row per month, oldest first.
 *
 * @param months - the months
 * @param columns - which numbers, in order, with their headings (the month comes first)
 * @param monthHeading - the first column's heading
 * @returns the file's text
 */
export function investorMonthsCsv(
  months: InvestorMonth[],
  columns: CsvColumn<Exclude<keyof InvestorMonth, 'month'>>[],
  monthHeading: string,
): string {
  const header = [monthHeading, ...columns.map((column) => column.label)].map(csvCell).join(',');
  const rows = months.map((month) =>
    [month.month, ...columns.map((column) => numberCell(month[column.key]))].join(','),
  );
  return [header, ...rows].join('\r\n');
}

/**
 * The daily numbers as a CSV file, one row per day and one column per number.
 *
 * @param days - every stored number by day
 * @param columns - which numbers, in order, with their headings (the day comes first)
 * @param dayHeading - the first column's heading
 * @returns the file's text
 */
export function investorDaysCsv(
  days: InvestorDayNumber[],
  columns: CsvColumn<string>[],
  dayHeading: string,
): string {
  // Step 1: gather each day's numbers by metric.
  const byDay = new Map<string, Map<string, number>>();
  for (const entry of days) {
    const numbers = byDay.get(entry.day) ?? new Map<string, number>();
    numbers.set(entry.metric, entry.value);
    byDay.set(entry.day, numbers);
  }
  // Step 2: one row per day, oldest first, an empty cell where a number wasn't counted.
  const header = [dayHeading, ...columns.map((column) => column.label)].map(csvCell).join(',');
  const rows = [...byDay.keys()]
    .sort()
    .map((day) =>
      [day, ...columns.map((column) => numberCell(byDay.get(day)?.get(column.key)))].join(','),
    );
  return [header, ...rows].join('\r\n');
}
