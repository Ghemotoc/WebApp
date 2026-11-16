/**
 * Tests for the language names (bundle TRANSLATE-1b): the two forms the reading screens use.
 */
import { describe, expect, it } from 'vitest';

import { languageNameIn, languageOwnName } from './language-names';

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
