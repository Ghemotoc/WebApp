/**
 * Names and choices the markets and languages lists share (story S1-E11-05).
 *
 * Who calls it: components/LanguagesList.tsx and components/MarketsList.tsx.
 */
import type { OpeningStatus } from '../api/marketsAdmin';

/** The statuses, in the order the chips show them. */
export const openingStatuses: OpeningStatus[] = ['open', 'ready', 'closed'];

/**
 * A language's name in the page's language, from the browser's own list of names.
 *
 * @param code - a BCP 47 code, for example 'ro'
 * @param pageLanguage - the page's language
 * @returns the name, or the code when the browser doesn't know it
 */
export function languageNameOf(code: string, pageLanguage: string): string {
  try {
    return new Intl.DisplayNames([pageLanguage], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
