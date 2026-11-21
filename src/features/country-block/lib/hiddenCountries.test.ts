/**
 * Tests for the "Where it shows" list rules (bundle COUNTRY-1).
 */
import { describe, expect, it } from 'vitest';

import { addableCountries, withCountry, withoutCountry } from './hiddenCountries';

describe('the hidden countries list', () => {
  it('adds a country once and keeps the codes in order', () => {
    expect(withCountry(['NO'], 'MD')).toEqual(['MD', 'NO']);
    expect(withCountry(['MD'], 'MD')).toEqual(['MD']);
  });

  it('takes a country off when it is selected again', () => {
    expect(withoutCountry(['MD', 'NO'], 'MD')).toEqual(['NO']);
  });

  it('offers only the markets not chosen yet, by name', () => {
    const choices = addableCountries(['SE', 'MD', 'DK'], ['MD'], 'en');
    expect(choices.map((choice) => choice.code)).toEqual(['DK', 'SE']);
    expect(choices[0]?.name).toBe('Denmark');
  });
});
