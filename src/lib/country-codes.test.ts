/**
 * Tests for the country picker's list (src/lib/country-codes.ts; BUGS thread, 26 Nov 2026).
 * Who runs it: Vitest, in CI and in `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { countryCodes } from './country-codes';

describe('the countries a person can say they live in', () => {
  it('leaves out the places where nobody lives', () => {
    // Antarctica and the uninhabited islands are not places anyone can live in.
    for (const uninhabited of ['AQ', 'BV', 'HM', 'GS', 'TF', 'IO', 'UM']) {
      expect(countryCodes).not.toContain(uninhabited);
    }
  });

  it('names every place with a capitalised name from the browser, in English and Romanian', () => {
    // Each code must have a real name, never the bare code and never a lower-case one.
    for (const language of ['en', 'ro']) {
      const names = new Intl.DisplayNames([language], { type: 'region' });
      for (const code of countryCodes) {
        const name = names.of(code) ?? code;
        expect(name).not.toBe(code);
        expect(name.charAt(0)).toBe(name.charAt(0).toLocaleUpperCase(language));
      }
    }
  });

  it('lists Mexico, Monaco and Moldova under their proper names', () => {
    // Robert saw "mexico City" and "monaco" on his phone (26 Nov 2026); our own names are right.
    const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
    expect(englishNames.of('MX')).toBe('Mexico');
    expect(englishNames.of('MC')).toBe('Monaco');
    expect(englishNames.of('MD')).toBe('Moldova');
    expect(countryCodes).toEqual(expect.arrayContaining(['MX', 'MC', 'MD']));
  });
});
