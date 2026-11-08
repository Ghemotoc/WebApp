/**
 * The seasonal calendar's pure helpers (stories S1-E11-11 and S1-E5-07).
 *
 * What it holds: which file each seasonal doodle uses, the reader's own date, whether an occasion
 * covers a day (the same rule as occasion_covers() in …_s1_e11_11_seasonal_occasions.sql, so the
 * staff year view shows what readers will see), and the days of a year no occasion covers.
 * Who calls it: the staff occasion form and year view.
 * It calls nothing else.
 */
import type { DoodleName } from '@/components/ui/doodleSources';
import type { Enums } from '@/lib/database.types';

/** A seasonal doodle, as the database names it. */
export type SeasonalDoodleName = Enums<'seasonal_doodle'>;

/**
 * The file of each seasonal doodle. A new value in the database enum fails the type check here
 * until its SVG file is added (S1-E11-11: new doodles arrive in a release, never as uploads).
 */
export const seasonalDoodleFiles = {
  autumn_leaf: 'autumn-leaf',
  bee: 'bee',
  butterfly: 'butterfly',
  candle: 'candle',
  cherry_blossom: 'cherry-blossom',
  daisy: 'daisy',
  friendly_ghost: 'friendly-ghost',
  hot_air_balloon: 'hot-air-balloon',
  hot_chocolate: 'hot-chocolate',
  jack_o_lantern: 'jack-o-lantern',
  kite: 'kite',
  mushroom: 'mushroom',
  rain_cloud: 'rain-cloud',
  sunny_face: 'sunny-face',
} as const satisfies Record<SeasonalDoodleName, DoodleName>;

/** Every seasonal doodle, in the order the picker shows them. */
export const seasonalDoodleNames = Object.keys(seasonalDoodleFiles) as SeasonalDoodleName[];

/** The dates of one occasion, as stored ("2027-12-01"). */
export interface OccasionDates {
  startsOn: string;
  endsOn: string;
  everyYear: boolean;
}

/**
 * The reader's own date as "yyyy-mm-dd", from the device's clock (S1-E5-07: no location used).
 *
 * @param now - the moment to read; the current time by default
 * @returns the local date
 */
export function localDateOf(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}

/**
 * A date's month and day as one number: 14 February is 214.
 *
 * @param isoDate - "yyyy-mm-dd"
 * @returns the number
 */
function monthDayOf(isoDate: string): number {
  return Number(isoDate.slice(5, 7)) * 100 + Number(isoDate.slice(8, 10));
}

/**
 * Whether an occasion shows on a day.
 *
 * @param occasion - its first and last day and whether it comes back every year
 * @param isoDate - the day, "yyyy-mm-dd"
 * @returns true when the day is in the range; yearly ranges wrap over New Year
 */
export function occasionCovers(occasion: OccasionDates, isoDate: string): boolean {
  // Step 1: a one-off occasion covers only its own dates (ISO dates sort as text).
  if (!occasion.everyYear) return isoDate >= occasion.startsOn && isoDate <= occasion.endsOn;
  const firstDay = monthDayOf(occasion.startsOn);
  const lastDay = monthDayOf(occasion.endsOn);
  const thisDay = monthDayOf(isoDate);
  // Step 2: a yearly range inside one year, such as 25 to 31 October.
  if (occasion.startsOn.slice(0, 4) === occasion.endsOn.slice(0, 4)) {
    return thisDay >= firstDay && thisDay <= lastDay;
  }
  // Step 3: a yearly range over New Year, such as 1 December to 29 February.
  return thisDay >= firstDay || thisDay <= lastDay;
}

/**
 * Every day of a year, as "yyyy-mm-dd".
 *
 * @param year - the year
 * @returns the days in order
 */
export function daysOfYear(year: number): string[] {
  const days: string[] = [];
  const day = new Date(Date.UTC(year, 0, 1));
  while (day.getUTCFullYear() === year) {
    days.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return days;
}

/**
 * The days of a year that no occasion covers, so staff can see the gaps (S1-E11-11 criterion 4).
 *
 * @param occasions - the schedule
 * @param year - the year shown
 * @returns the uncovered days
 */
export function uncoveredDays(occasions: OccasionDates[], year: number): string[] {
  return daysOfYear(year).filter(
    (isoDate) => !occasions.some((occasion) => occasionCovers(occasion, isoDate)),
  );
}
