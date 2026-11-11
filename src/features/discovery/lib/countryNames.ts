/**
 * countryNames: a country's name in the interface language, for "Popular in" (bundle MARKETS-2,
 * part d).
 *
 * The browser knows every country's name in every language (Intl.DisplayNames), so no list of
 * names lives in the locale files.
 * Who calls it: PopularInSelect and PopularInNote.
 */

/**
 * A country's name ("Sweden", "Suedia").
 *
 * @param code - the two-letter country code
 * @param language - the interface language
 * @returns the name, or the code when the browser doesn't know it
 */
export function countryName(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    // An old browser without Intl.DisplayNames: the code still says which country it is.
    return code;
  }
}
