/**
 * The years the sign-up form offers for the year of birth (story S1-E2-01; S1-E2-02 adds the
 * month and the age rules).
 *
 * Who calls it: YearOfBirthField. Years run from this year, in Romanian time, back 100 years, as on
 * board 2.1; under-13 years stay in the list so the form can say why it refuses them.
 */

/** How many years back the list goes. */
const yearsListed = 100;

/**
 * The years to offer, newest first.
 *
 * @param today - the date to count from (tests pass a fixed one)
 * @returns the years as strings, for example ["2026", "2025", …, "1926"]
 */
export function listBirthYears(today: Date = new Date()): string[] {
  const thisYear = Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Bucharest' }).format(today),
  );
  return Array.from({ length: yearsListed + 1 }, (_unused, index) => String(thisYear - index));
}
