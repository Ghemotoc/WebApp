/**
 * The age rules the sign-up form shows straight away, the same as the database applies
 * (story S1-E2-02). Shared by the form (src/features/auth/) and the form rules (src/schemas/). The database is the authority: sign_up_age_outcome() and the sign-up trigger
 * (supabase/migrations/…_s1_e2_02_birth_checks.sql) apply the same rules again, and these tests
 * (age.test.ts) and pgTAP 020 and 024 check both sides with the same examples.
 *
 * Rules (decided 16 Oct 2026, Q16; 17 Oct 2026, 12:44):
 * - The month is asked only when the year leaves the age unclear at 13 or 16.
 * - The person counts as the younger possible age: with a year only, as if born on 31 December;
 *   with a month, they reach a new age on the first day of the month after their birthday month
 *   (born May 2011: 15 until 1 June 2027).
 * - Under 13 is refused; while adults_only is on (the March test), under 18 is refused too.
 * Dates are Romanian dates (the first market), like the database's.
 */

/** What sign-up would say about a year (and month). */
export type SignUpAgeOutcome = 'ok' | 'year_needed' | 'month_needed' | 'under_13' | 'adults_only';

/** A calendar date as numbers, so tests can fix "today". */
export interface CalendarDate {
  year: number;
  /** 1 to 12. */
  month: number;
}

/**
 * Today's year and month in Romanian time.
 *
 * @param now - the moment to read (tests pass a fixed one)
 * @returns the year and month
 */
export function romanianToday(now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month') };
}

/**
 * Whether the year leaves the age unclear at 13 or 16 this year, so the month is asked.
 *
 * @param birthYear - the year chosen
 * @param today - today's date
 * @returns true when the person turns 13 or 16 during this year
 */
export function birthYearNeedsMonth(birthYear: number, today: CalendarDate): boolean {
  const ageThisYear = today.year - birthYear;
  return ageThisYear === 13 || ageThisYear === 16;
}

/**
 * The younger possible age.
 *
 * @param birthYear - the year
 * @param birthMonth - the month, or null when only the year counts
 * @param today - today's date
 * @returns the age in whole years
 */
export function youngestPossibleAge(
  birthYear: number,
  birthMonth: number | null,
  today: CalendarDate,
): number {
  const ageThisYear = today.year - birthYear;
  // Year only: the birthday counts as 31 December. With a month: as the last day of that month.
  const birthdayHasPassed = birthMonth !== null && today.month > birthMonth;
  return birthdayHasPassed ? ageThisYear : ageThisYear - 1;
}

/**
 * What sign-up says about a year and month, before anything is sent.
 *
 * @param birthYear - the year chosen, or null
 * @param birthMonth - the month chosen, or null
 * @param isAdultsOnly - the adults_only flag (on in March)
 * @param today - today's date
 * @returns the outcome; only 'ok' lets the form send
 */
export function signUpAgeOutcome(
  birthYear: number | null,
  birthMonth: number | null,
  isAdultsOnly: boolean,
  today: CalendarDate,
): SignUpAgeOutcome {
  if (birthYear === null) return 'year_needed';
  const needsMonth = birthYearNeedsMonth(birthYear, today);
  if (needsMonth && birthMonth === null) return 'month_needed';
  const age = youngestPossibleAge(birthYear, needsMonth ? birthMonth : null, today);
  if (age < 13) return 'under_13';
  if (isAdultsOnly && age < 18) return 'adults_only';
  return 'ok';
}

/**
 * Whether someone is younger than their market's minimum age (story S1-E2-10; decided 16 Oct
 * 2026, late evening, Q19: Australia is 16 and over). Uses the younger possible age, like every
 * other age rule here.
 *
 * @param birthYear - the year of birth
 * @param birthMonth - the month, or null when the year doesn't need it
 * @param minimumAge - the market's minimum age
 * @param today - today in Romania
 * @returns true when the person is too young for this market
 */
export function isUnderMarketAge(
  birthYear: number,
  birthMonth: number | null,
  minimumAge: number,
  today: CalendarDate,
): boolean {
  const needsMonth = birthYearNeedsMonth(birthYear, today);
  return youngestPossibleAge(birthYear, needsMonth ? birthMonth : null, today) < minimumAge;
}
