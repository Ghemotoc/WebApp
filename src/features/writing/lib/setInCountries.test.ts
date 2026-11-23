/**
 * Tests for the "Set in" field's rules (CALM-9, board D02).
 */
import { describe, expect, it } from 'vitest';

import { findSetInCountry, setInChoices, setInPhrase } from './setInCountries';

describe('setInCountries', () => {
  it('offers every country except the ones already chosen, sorted by name', () => {
    const choices = setInChoices(['RO'], 'en');
    expect(choices.some((choice) => choice.code === 'RO')).toBe(false);
    expect(choices.some((choice) => choice.code === 'MD')).toBe(true);
    const names = choices.map((choice) => choice.name);
    expect(names).toEqual([...names].sort((first, second) => first.localeCompare(second, 'en')));
  });

  it('finds a country by its name in any capitals, or by its code', () => {
    const choices = setInChoices([], 'en');
    expect(findSetInCountry('romania', choices)).toBe('RO');
    expect(findSetInCountry('  Moldova ', choices)).toBe('MD');
    expect(findSetInCountry('se', choices)).toBe('SE');
    expect(findSetInCountry('Narnia', choices)).toBeNull();
    expect(findSetInCountry('', choices)).toBeNull();
  });

  it('finds a Romanian name with or without diacritics', () => {
    const choices = setInChoices([], 'ro');
    expect(findSetInCountry('România', choices)).toBe('RO');
    expect(findSetInCountry('Romania', choices)).toBe('RO');
  });

  it('a country already chosen is not found again', () => {
    expect(findSetInCountry('Romania', setInChoices(['RO'], 'en'))).toBeNull();
  });

  it('joins the names as a phrase in the interface language', () => {
    expect(setInPhrase(['RO'], 'en')).toBe('Romania');
    expect(setInPhrase(['RO', 'MD'], 'en')).toBe('Romania and Moldova');
    expect(setInPhrase([], 'en')).toBe('');
  });
});
