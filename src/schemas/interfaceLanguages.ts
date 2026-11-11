/**
 * The one list of interface languages the app knows, shared by the screens, the Pages Functions
 * and the forms' zod schemas (bundle MARKETS-2, part a; story S1-E11-31).
 *
 * Why one list: before MARKETS-2 the pair "ro, en" was written out in about 37 places, so adding a
 * language meant finding them all. Now a screen, a form or a server reads this file, and the
 * database reads its twin, public.interface_language_codes() (migration
 * 20270205100200_markets2a_nordic_languages.sql). Change both together.
 *
 * Two lists, because knowing a language is not the same as having its text:
 * - interfaceLanguages: every language a person may pick once staff open it (Romanian, English,
 *   Swedish, Danish and Norwegian Bokmål; Robert, 8 Nov 2026, 07:53 UTC). Whether one is open is
 *   the `languages` table's status, read by useOpenInterfaceLanguages(); a closed language shows
 *   nowhere.
 * - writtenLanguages: the languages that have every text written: the locale files, the emails and
 *   the legal texts. Any other language falls back to English, key by key (the brief: "Until a
 *   file lands, the language stays closed and falls back to English").
 * Who calls it: src/lib/i18n.ts, the language menus, src/schemas/*.ts and server/*.ts.
 * What it calls: nothing.
 */

/** Every interface language, in the order the language menus list them. */
export const interfaceLanguages = ['en', 'ro', 'sv', 'da', 'nb'] as const;

/** One interface language code (BCP 47: nb is Norwegian Bokmål, the only Norwegian we ship). */
export type InterfaceLanguage = (typeof interfaceLanguages)[number];

/** The languages whose texts (locale files, emails, legal texts) are complete. */
export const writtenLanguages = ['ro', 'en'] as const;

/** A language with every text written. */
export type WrittenLanguage = (typeof writtenLanguages)[number];

/**
 * Says whether a value is one of the interface languages.
 *
 * @param value - anything: a stored value, a column, a drop-down value
 * @returns true for en, ro, sv, da or nb
 */
export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return interfaceLanguages.includes(value as InterfaceLanguage);
}

/**
 * The written language to use for a person's language: their own when its texts exist, English
 * otherwise (brief MARKETS-2: a language without its files falls back to English). No language at
 * all, or a value that isn't a language, keeps the app's first-visit default, Romanian, as every
 * caller did before MARKETS-2.
 *
 * @param language - a language code, or null when none is known
 * @returns 'ro' or 'en'
 */
export function writtenLanguageFor(language: string | null | undefined): WrittenLanguage {
  // Step 1: a language with its own texts is used as it is.
  if (language === 'ro' || language === 'en') return language;
  // Step 2: a known language without them (sv, da, nb) reads in English.
  if (isInterfaceLanguage(language)) return 'en';
  // Step 3: nothing known: the default, Romanian.
  return 'ro';
}
