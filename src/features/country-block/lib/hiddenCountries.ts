/**
 * hiddenCountries: the small rules of the "Where it shows" list (bundle COUNTRY-1, board D07).
 *
 * Who calls it: components/HiddenCountriesPicker.tsx. Pure functions, so they are unit-tested.
 * The database cleans the list again (clean_country_codes()); these only keep the screen tidy.
 */
import { countryName } from '@/features/discovery/lib/countryNames';

/** One country the writer can add, with its name in the interface language. */
export interface CountryChoice {
  code: string;
  name: string;
}

/**
 * Adds a country to the list, once, keeping the list in code order.
 *
 * @param hidden - the countries chosen so far
 * @param code - the two-letter code to add
 * @returns the new list
 */
export function withCountry(hidden: readonly string[], code: string): string[] {
  if (hidden.includes(code)) return [...hidden];
  return [...hidden, code].sort();
}

/**
 * Takes a country off the list ("Select a country again to show the story there").
 *
 * @param hidden - the countries chosen so far
 * @param code - the code to take off
 * @returns the new list
 */
export function withoutCountry(hidden: readonly string[], code: string): string[] {
  return hidden.filter((each) => each !== code);
}

/**
 * The countries the drop-down offers: the markets not chosen yet, by name in the interface language.
 *
 * @param marketCodes - every market's code
 * @param hidden - the countries already chosen
 * @param language - the interface language, for the names and their order
 * @returns the choices, sorted by name
 */
export function addableCountries(
  marketCodes: readonly string[],
  hidden: readonly string[],
  language: string,
): CountryChoice[] {
  const choices = marketCodes
    .filter((code) => !hidden.includes(code))
    .map((code) => ({ code, name: countryName(code, language) }));
  return choices.sort((first, second) => first.name.localeCompare(second.name, language));
}
