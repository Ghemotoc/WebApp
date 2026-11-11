/**
 * firstVisitLanguage: the language a first-time visitor sees, from the country of their
 * connection (bundle MARKETS-2, part a; story S1-E11-31).
 *
 * The rule (the MARKETS-2 brief: "when a visitor from SE, DK or NO first arrives and their
 * language is open, then the site opens in it; otherwise in English. Romania and Moldova keep
 * Romanian first"):
 *   - Sweden, Denmark, Norway: Swedish, Danish or Norwegian Bokmål when staff have opened it,
 *     English while it is closed;
 *   - Romania and Moldova: Romanian;
 *   - any other known country: English (the eleven launch markets are otherwise English-speaking;
 *     Robert, 10 Nov 2026: English is the primary language);
 *   - no country known (Tor, a VPN, local development without a fake country): no change, so the
 *     app keeps its default, Romanian (decided 17 Oct 2026, 11:48).
 * A choice the visitor made, or their account's language, always wins: the hook that calls this
 * runs only while neither exists.
 * Who calls it: useFirstVisitLanguage(). What it calls: nothing.
 */
import type { InterfaceLanguage } from '@/schemas/interfaceLanguages';

/** The Nordic launch countries and their own language. */
const nordicLanguageByCountry: Record<string, InterfaceLanguage> = {
  SE: 'sv',
  DK: 'da',
  NO: 'nb',
};

/** The countries whose visitors start in Romanian. */
const romanianCountries = new Set(['RO', 'MD']);

/**
 * Picks the first-visit language.
 *
 * @param country - the connection's country (ISO alpha-2, upper case), or null when unknown
 * @param openLanguages - the interface languages staff have opened
 * @returns the language to show, or null to keep the default
 */
export function firstVisitLanguage(
  country: string | null,
  openLanguages: readonly InterfaceLanguage[],
): InterfaceLanguage | null {
  // Step 1: no country, no hint.
  if (country === null) return null;
  // Step 2: Romania and Moldova read in Romanian first.
  if (romanianCountries.has(country)) return 'ro';
  // Step 3: a Nordic country gets its own language once it is open.
  const ownLanguage = nordicLanguageByCountry[country];
  if (ownLanguage !== undefined && openLanguages.includes(ownLanguage)) return ownLanguage;
  // Step 4: everyone else, and a Nordic visitor while their language is closed: English.
  return 'en';
}
