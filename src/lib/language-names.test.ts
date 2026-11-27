/**
 * Tests for the language names (bundle TRANSLATE-1b): the two forms the reading screens use.
 */
import { describe, expect, it } from 'vitest';

import {
  languageChoices,
  languageMatchesSearch,
  languageMenuName,
  languageNameIn,
  languageOwnName,
  languagesToList,
} from './language-names';

describe('language names', () => {
  it('names a language in the language of the sentence', () => {
    expect(languageNameIn('ro', 'en')).toBe('Romanian');
    expect(languageNameIn('en', 'ro')).toBe('engleză');
  });

  it('names a language in its own words, with a capital, for menus', () => {
    expect(languageOwnName('ro')).toBe('Română');
    expect(languageOwnName('en')).toBe('English');
  });

  it('falls back to the code for something that is not a language', () => {
    expect(languageNameIn('not a code', 'en')).toBe('not a code');
  });
});

describe('language menus (S1-E3-01)', () => {
  it('names a language in the interface language, with a capital', () => {
    expect(languageMenuName('ja', 'ro')).toBe('Japoneză');
    expect(languageMenuName('ja', 'en')).toBe('Japanese');
  });

  it('sorts the choices by their names in the interface language', () => {
    const choices = languageChoices(['ro', 'en', 'de'], 'ro');
    expect(choices.map((choice) => choice.code)).toEqual(['en', 'de', 'ro']);
    expect(choices[0]).toEqual({ code: 'en', label: 'Engleză' });
  });

  it('finds a language by its name without accents, by its own name or by its code', () => {
    const romanian = { code: 'ro', label: 'Română' };
    expect(languageMatchesSearch(romanian, 'roman')).toBe(true);
    expect(languageMatchesSearch({ code: 'ja', label: 'Japoneză' }, '日本')).toBe(true);
    expect(languageMatchesSearch(romanian, 'RO')).toBe(true);
    expect(languageMatchesSearch(romanian, 'japon')).toBe(false);
  });

  it('keeps every language while nothing is typed', () => {
    expect(languageMatchesSearch({ code: 'sv', label: 'Suedeză' }, '  ')).toBe(true);
  });
});

describe('the languages a searchable picker lists', () => {
  const choices = languageChoices(['ro', 'en', 'ja', 'sv'], 'en');

  it('lists only the languages that match what was typed', () => {
    const { listed, matchCount } = languagesToList(choices, 'jap', '');
    expect(listed.map((choice) => choice.code)).toEqual(['ja']);
    expect(matchCount).toBe(1);
  });

  it('keeps the chosen language first even when it does not match', () => {
    const { listed, matchCount } = languagesToList(choices, 'swe', 'ro');
    expect(listed.map((choice) => choice.code)).toEqual(['ro', 'sv']);
    expect(matchCount).toBe(1);
  });

  it('lists every language, in name order, while nothing is typed', () => {
    const { listed } = languagesToList(choices, '', 'ro');
    expect(listed.map((choice) => choice.code)).toEqual(['en', 'ja', 'ro', 'sv']);
  });
});
