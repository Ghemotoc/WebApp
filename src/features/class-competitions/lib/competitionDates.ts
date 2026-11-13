/**
 * competitionDates: the dates the competition form starts with (bundle CLASS-POINTS, part 2;
 * story S1-E8-15). The database decides what is allowed (first day from today, last day before
 * the class closes); these are only a sensible starting point.
 *
 * Who calls it: CompetitionFormPage. What it calls: nothing.
 */

/** How many days a new competition runs unless the teacher changes the dates. */
const defaultLengthInDays = 14;

/**
 * A date as the YYYY-MM-DD text a date field and the database use.
 *
 * @param date - a date built in UTC
 * @returns the day as text
 */
function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The first and last day a new competition's form starts with: today and two weeks later.
 * "Today" comes from the database (class_competitions() → today), not from the device's clock:
 * a teacher's laptop set to another time zone, or opened just after midnight, would otherwise
 * start on a day the database calls the past and refuses.
 *
 * @param today - today as YYYY-MM-DD where class weeks are counted
 * @returns the two days as YYYY-MM-DD; both empty when today isn't a date
 */
export function defaultDates(today: string): { startsOn: string; endsOn: string } {
  const [year, month, day] = today.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return { startsOn: '', endsOn: '' };
  }
  const end = new Date(Date.UTC(year, month - 1, day + defaultLengthInDays));
  if (Number.isNaN(end.getTime())) return { startsOn: '', endsOn: '' };
  return { startsOn: today, endsOn: dayOf(end) };
}
