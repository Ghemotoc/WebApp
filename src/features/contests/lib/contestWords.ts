/**
 * Small helpers for showing a contest's words in the reader's language (story S1-E11-15; bundle
 * CONTESTS-13b1).
 *
 * Who calls it: StoryContestCard and the staff screens.
 */
import { formatRomaniaDate } from '@/lib/romania-time';

/** Anything with a name in both languages. */
interface NamedInBothLanguages {
  name_ro: string;
  name_en: string;
}

/**
 * The contest's name in the interface language: Romanian for "ro", English otherwise (the two
 * languages staff write it in, criterion 1).
 *
 * @param contest - a contest with both names
 * @param language - the interface language, for example "ro" or "en-GB"
 * @returns the name, or the other language's name when this one is empty
 */
export function contestNameIn(contest: NamedInBothLanguages, language: string): string {
  const isRomanian = language.toLowerCase().startsWith('ro');
  const wanted = isRomanian ? contest.name_ro : contest.name_en;
  const other = isRomanian ? contest.name_en : contest.name_ro;
  return wanted.trim() === '' ? other : wanted;
}

/**
 * A day (YYYY-MM-DD, Romanian time) in words.
 *
 * @param day - the ISO date
 * @param language - the interface language
 * @returns the date as readers read it
 */
export function contestDayInWords(day: string, language: string): string {
  // Noon UTC keeps the same calendar day in Romanian time.
  return formatRomaniaDate(new Date(`${day}T12:00:00Z`), language);
}

/**
 * A country's name in the interface language, from the browser's own list of names.
 *
 * @param code - a country code, for example "RO"
 * @param language - the interface language
 * @returns the name, or the code when the browser doesn't know it
 */
export function countryNameOf(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
