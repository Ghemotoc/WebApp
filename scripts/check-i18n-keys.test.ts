/**
 * Tests for the translation check (story S1-E1-01).
 * Proves "the i18n key check fails when a key exists in one locale only" and that today's locale
 * files pass it.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkLocales,
  compareNordicLanguage,
  findCedillaLetters,
  findMissingKeys,
  flattenTranslations,
} from './check-i18n-keys';

describe('the i18n key check', () => {
  it('passes on the locale files in the repository', () => {
    const localesFolder = fileURLToPath(new URL('../src/locales', import.meta.url));

    expect(checkLocales(localesFolder)).toEqual([]);
  });

  it('turns nested groups into dotted keys', () => {
    const flat = flattenTranslations({ home: { welcome: 'Hi', menu: { open: 'Open' } } });

    expect([...flat.keys()]).toEqual(['home.welcome', 'home.menu.open']);
  });

  it('reports a key that exists in Romanian but not in English', () => {
    const romanian = flattenTranslations({ home: { welcome: 'Bun venit', extra: 'În plus' } });
    const english = flattenTranslations({ home: { welcome: 'Welcome' } });

    expect(findMissingKeys('common', romanian, english)).toEqual([
      'common.json: "home.extra" is missing in en',
    ]);
  });

  it('reports a key that exists in English but not in Romanian', () => {
    const romanian = flattenTranslations({});
    const english = flattenTranslations({ save: 'Save' });

    expect(findMissingKeys('common', romanian, english)).toEqual([
      'common.json: "save" is missing in ro',
    ]);
  });

  it('reports Romanian text written with a cedilla ş instead of ș', () => {
    // "ş" is ş (cedilla), the wrong letter.
    const romanian = flattenTranslations({ greeting: 'Bine aşi venit' });

    expect(findCedillaLetters('common', romanian)).toHaveLength(1);
  });

  it('accepts Romanian text written with the comma-below ș and ț', () => {
    const romanian = flattenTranslations({ greeting: 'Povești și țări' });

    expect(findCedillaLetters('common', romanian)).toEqual([]);
  });

  // MARKETS-2a: a Nordic folder being translated.
  it('a Swedish file that is only part done gives a warning, not a failure', () => {
    const english = new Map([['common', flattenTranslations({ save: 'Save', cancel: 'Cancel' })]]);
    const swedish = new Map([['common', flattenTranslations({ save: 'Spara' })]]);

    const findings = compareNordicLanguage('sv', swedish, english);

    expect(findings.problems).toEqual([]);
    expect(findings.warnings).toEqual([
      'sv/common.json: 1 of 2 keys not translated yet (they read in English)',
    ]);
  });

  it('a Swedish key that English doesn’t have fails the check', () => {
    const english = new Map([['common', flattenTranslations({ save: 'Save' })]]);
    const swedish = new Map([['common', flattenTranslations({ save: 'Spara', sav: 'Spara' })]]);

    expect(compareNordicLanguage('sv', swedish, english).problems).toEqual([
      'sv/common.json has "sav", which en doesn\'t',
    ]);
  });
});
