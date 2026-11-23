/**
 * setInCountries: the small rules of the "Set in" field, where a story takes place (CALM-9,
 * board D02, step 2 "Category, tags and setting").
 *
 * Who calls it: components/SetInCountriesField.tsx and the preview's "Set in" line. Pure
 * functions, so they are unit-tested. The database cleans the list again
 * (set_my_story_set_in_countries()); these only keep the screen tidy.
 */
import { countryName } from '@/features/discovery/lib/countryNames';
import { countryCodes } from '@/lib/country-codes';

/** One country the writer can pick, with its name in the interface language. */
export interface SetInChoice {
  code: string;
  name: string;
}

/**
 * Every country not chosen yet, by name in the interface language, for the search field's list.
 *
 * @param chosen - the codes already chosen
 * @param language - the interface language, for the names and their order
 * @returns the choices, sorted by name
 */
export function setInChoices(chosen: readonly string[], language: string): SetInChoice[] {
  const choices = countryCodes
    .filter((code) => !chosen.includes(code))
    .map((code) => ({ code, name: countryName(code, language) }));
  return choices.sort((first, second) => first.name.localeCompare(second.name, language));
}

/**
 * A name for comparing: lower case, without accents or diacritics ("România" → "romania"), so a
 * writer finds a country however they type it. Romanian sorts â as its own letter, so the
 * language's own comparison would miss "Romania".
 *
 * @param name - a country name or what was typed
 * @returns the plain form
 */
function plainName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * The country a writer typed or picked from the list, by its name (any capitals, accents or diacritics) or
 * its two-letter code.
 *
 * @param typed - what is in the search field
 * @param choices - the countries on offer (setInChoices())
 * @returns the code, or null when the text names no country on offer
 */
export function findSetInCountry(typed: string, choices: readonly SetInChoice[]): string | null {
  const wanted = plainName(typed);
  if (wanted === '') return null;
  const match = choices.find(
    (choice) => plainName(choice.name) === wanted || choice.code.toLowerCase() === wanted,
  );
  return match === undefined ? null : match.code;
}

/**
 * The countries as one phrase for the preview and the wizard's summary: "Romania" or
 * "Romania, Moldova" (the browser's list formatting gives "Romania and Moldova" in English and
 * "Romania și Moldova" in Romanian).
 *
 * @param codes - the chosen codes
 * @param language - the interface language
 * @returns the phrase, or an empty string when none is chosen
 */
export function setInPhrase(codes: readonly string[], language: string): string {
  const names = codes.map((code) => countryName(code, language));
  try {
    return new Intl.ListFormat([language], { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    // An old browser without Intl.ListFormat: commas still read well.
    return names.join(', ');
  }
}
