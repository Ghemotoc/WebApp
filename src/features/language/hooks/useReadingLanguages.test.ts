/**
 * Tests for the default reading languages (bundle MARKETS-2, part c; IDEA-20261109-2): a member
 * who picked none reads the interface language plus English; a signed-out visitor reads only the
 * language menu's language.
 *
 * Who runs it: `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { defaultReadingLanguages } from './useReadingLanguages';

describe('the reading languages when none are picked', () => {
  it('gives a member the interface language and English', () => {
    expect(defaultReadingLanguages('sv', true)).toEqual(['sv', 'en']);
  });

  it('gives an English-speaking member English once', () => {
    expect(defaultReadingLanguages('en', true)).toEqual(['en']);
  });

  it('gives a signed-out visitor only the language menu’s language', () => {
    expect(defaultReadingLanguages('ro', false)).toEqual(['ro']);
  });
});
