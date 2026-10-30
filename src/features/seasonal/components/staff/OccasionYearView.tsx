/**
 * OccasionYearView: the year at a glance, month by month: which occasions show and how many days
 * have no doodle at all (story S1-E11-11 criterion 4: "a year view shows every occasion and any
 * gaps").
 *
 * Each month is one row, with a fine line between rows (DoD design rules, label rows). A month
 * lists its occasions with their days in that month; a month with gaps says how many days. The
 * rule for which days an occasion covers is occasionCovers(), the same as the database's.
 * Who shows it: SeasonalTab. What it calls: lib/seasonalCalendar.ts.
 */
import { useTranslation } from 'react-i18next';

import type { Occasion } from '../../api/seasonalStore';
import { daysOfYear, occasionCovers } from '../../lib/seasonalCalendar';

/** What the year view needs. */
interface OccasionYearViewProps {
  occasions: Occasion[];
  year: number;
}

/** One month: its name, the occasions in it with their day numbers, and its gap days. */
interface MonthSummary {
  monthIndex: number;
  occasions: { occasion: Occasion; firstDay: number; lastDay: number }[];
  gapDays: number;
}

/**
 * Works out every month of a year.
 *
 * @param occasions - the schedule
 * @param year - the year
 * @returns twelve summaries, January first
 */
function monthsOf(occasions: Occasion[], year: number): MonthSummary[] {
  const days = daysOfYear(year);
  return Array.from({ length: 12 }, (_, monthIndex) => {
    // Step 1: the days of this month.
    const monthDays = days.filter((isoDate) => Number(isoDate.slice(5, 7)) === monthIndex + 1);
    // Step 2: each occasion that covers one of them, with the first and last day it covers.
    const inMonth = occasions.flatMap((occasion) => {
      const covered = monthDays.filter((isoDate) => occasionCovers(occasion, isoDate));
      const first = covered[0];
      const last = covered[covered.length - 1];
      if (first === undefined || last === undefined) return [];
      return [{ occasion, firstDay: Number(first.slice(8)), lastDay: Number(last.slice(8)) }];
    });
    // Step 3: the days nothing covers.
    const gapDays = monthDays.filter(
      (isoDate) => !occasions.some((occasion) => occasionCovers(occasion, isoDate)),
    ).length;
    return { monthIndex, occasions: inMonth, gapDays };
  });
}

/**
 * Renders the year.
 *
 * @returns the list of months
 */
export function OccasionYearView({ occasions, year }: OccasionYearViewProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long', timeZone: 'UTC' });
  const isRomanian = i18n.language.startsWith('ro');
  return (
    <section aria-labelledby="seasonal-year-heading" className="flex flex-col gap-3">
      <h2 id="seasonal-year-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('seasonal.yearHeading', { year })}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {monthsOf(occasions, year).map((month) => (
          <li
            key={month.monthIndex}
            className="grid gap-1 border-b border-hairline py-3 sm:grid-cols-[140px_1fr]"
          >
            <span className="font-semibold text-ink capitalize">
              {monthName.format(new Date(Date.UTC(year, month.monthIndex, 1)))}
            </span>
            <span className="flex flex-col gap-1 text-body">
              {month.occasions.map(({ occasion, firstDay, lastDay }) => (
                <span key={occasion.id}>
                  {isRomanian ? occasion.nameRo : occasion.nameEn}{' '}
                  <span className="text-meta">
                    {t('seasonal.dayRange', { first: firstDay, last: lastDay })}
                    {occasion.isSeasonDefault ? `, ${t('seasonal.defaultLabel')}` : ''}
                  </span>
                </span>
              ))}
              {month.gapDays > 0 && (
                <span className="font-semibold text-destructive">
                  {t('seasonal.gapDays', { count: month.gapDays })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
