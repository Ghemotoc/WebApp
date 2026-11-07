/**
 * countryName: a two-letter country code in the page's language ("RO" → "Romania"), for Staff ›
 * Waitlist (bundle WAITLIST-1). "ZZ" and an empty code read "Unknown country".
 *
 * Who calls it: WaitlistFilters and WaitlistPeopleTable.
 */
import type { TFunction } from 'i18next';

/**
 * The country's name.
 *
 * @param code - the code, or null
 * @param language - the page's language
 * @param t - the staff translation function, for "Unknown country"
 * @returns the name
 */
export function countryName(code: string | null, language: string, t: TFunction): string {
  if (code === null || code === '' || code === 'ZZ') return t('waitlist.unknownCountry');
  return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
}
