/**
 * The countries with researched safety contacts, and their names in the page's language (story
 * S1-E10-13a; decided 23 Oct 2026, Q9b: all ten, Romania first).
 *
 * Who calls it: CountryPicker and SafetyContactsBlock. The names come from the browser's own list
 * (Intl.DisplayNames), so no country name is typed into the locale files.
 */

/** The countries in content/safety-contacts.json, Romania first. */
export const coveredCountries = ['RO', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'SG', 'ZA', 'IN'];

/**
 * A country's name in the page's language.
 *
 * @param countryCode - ISO 3166-1 alpha-2
 * @param language - the page's language code
 * @returns the name, or the code when the browser has no name for it
 */
export function countryName(countryCode: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}
