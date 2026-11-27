/**
 * The name of a language, in whichever language the sentence around it is written
 * (bundle TRANSLATE-1b).
 *
 * Who calls it: src/features/reading/ (the "Read in" switch, "Translated from Romanian by …",
 * the chapter that isn't translated yet) and src/features/discovery/ (the language tags on cards).
 * What it calls next: the browser's own Intl.DisplayNames, so no list of names is kept here and
 * a language opened later needs no new text.
 * Two forms, because Romanian grammar needs both: languageOwnName('ro') is "Română", the name a
 * reader of that language looks for in a menu; languageNameIn('ro', 'en') is "Romanian" and
 * languageNameIn('ro', 'ro') is "română", for the middle of a sentence.
 * Story S1-E3-01 (Robert, 26 Nov 2026) adds the menu form, languageMenuName('ja', 'ro') =
 * "Japoneză", with languageChoices() and languageMatchesSearch() for the writer's searchable
 * picker of every language and the readers' language filters (src/features/writing/,
 * src/features/discovery/, src/features/search/, src/features/language/).
 */

/**
 * The name of a language inside a sentence written in another (or the same) language.
 *
 * @param languageCode - the language to name, such as 'ro' or 'en-GB'
 * @param sentenceLanguage - the language of the sentence, such as the interface language
 * @returns the name ("Romanian", "română"), or the code itself when the browser doesn't know it
 */
export function languageNameIn(languageCode: string, sentenceLanguage: string): string {
  try {
    const names = new Intl.DisplayNames([sentenceLanguage], { type: 'language' });
    return names.of(languageCode) ?? languageCode;
  } catch {
    // An odd code (or a very old browser): the code is still better than nothing.
    return languageCode;
  }
}

/**
 * The name of a language in that language, starting with a capital: "Română", "English".
 *
 * @param languageCode - the language to name
 * @returns the name as its own readers write it, for menus and lists
 */
export function languageOwnName(languageCode: string): string {
  const name = languageNameIn(languageCode, languageCode);
  return name.charAt(0).toLocaleUpperCase(languageCode) + name.slice(1);
}

/** One language in a picker or a filter: its code and its name in the interface language. */
export interface LanguageChoice {
  code: string;
  label: string;
}

/**
 * The name of a language for a menu in the interface language, starting with a capital:
 * "Japoneză" in Romanian, "Japanese" in English (story S1-E3-01; the search filter's names work
 * the same way).
 *
 * @param languageCode - the language to name, such as 'ja'
 * @param interfaceLanguage - the language the menu is written in
 * @returns the name, or the code itself when the browser doesn't know it
 */
export function languageMenuName(languageCode: string, interfaceLanguage: string): string {
  const name = languageNameIn(languageCode, interfaceLanguage);
  return name.charAt(0).toLocaleUpperCase(interfaceLanguage) + name.slice(1);
}

/**
 * The choices for a language picker or filter, named and sorted in the interface language.
 *
 * @param languageCodes - the languages to offer, in any order
 * @param interfaceLanguage - the language the menu is written in
 * @returns one choice per code, in the alphabetical order of their names ("Engleză" before "Română")
 */
export function languageChoices(
  languageCodes: readonly string[],
  interfaceLanguage: string,
): LanguageChoice[] {
  // Step 1: name each language in the interface language.
  const choices = languageCodes.map((code) => ({
    code,
    label: languageMenuName(code, interfaceLanguage),
  }));
  // Step 2: sort by the names the way that language sorts them (ș after s in Romanian).
  const collator = new Intl.Collator(interfaceLanguage);
  return choices.sort((first, second) => collator.compare(first.label, second.label));
}

/**
 * Text folded for a search: lower case, without accents, so "romana" finds "Română".
 *
 * @param text - what to fold
 * @returns the folded text
 */
function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase();
}

/**
 * Whether a language matches what someone typed in a language search: its name in the interface
 * language, its own name ("日本語", "Svenska") or its code.
 *
 * @param choice - the language
 * @param searchText - what was typed; empty matches every language
 * @returns true when the language should stay in the list
 */
export function languageMatchesSearch(choice: LanguageChoice, searchText: string): boolean {
  const wanted = foldForSearch(searchText.trim());
  if (wanted === '') return true;
  const names = [choice.label, languageOwnName(choice.code), choice.code];
  return names.some((name) => foldForSearch(name).includes(wanted));
}

/**
 * The languages a searchable picker lists while someone types: the ones that match, with the
 * language already chosen kept first when it doesn't match, so the drop-down never loses its
 * value.
 *
 * @param choices - every language the picker offers, in their order
 * @param searchText - what was typed
 * @param chosenCode - the language picked now, or '' for none
 * @returns the languages to list, and how many of them match
 */
export function languagesToList(
  choices: readonly LanguageChoice[],
  searchText: string,
  chosenCode: string,
): { listed: LanguageChoice[]; matchCount: number } {
  // Step 1: the languages that match what was typed.
  const matches = choices.filter((choice) => languageMatchesSearch(choice, searchText));
  // Step 2: the chosen one stays at the top even when it doesn't match.
  const chosen = choices.find((choice) => choice.code === chosenCode);
  const keepsChosen = chosen !== undefined && !matches.includes(chosen);
  const listed = keepsChosen ? [chosen, ...matches] : matches;
  return { listed, matchCount: matches.length };
}
