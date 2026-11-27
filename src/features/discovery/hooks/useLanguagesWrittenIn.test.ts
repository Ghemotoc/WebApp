/**
 * Which languages a reader's language filter offers (story S1-E3-01; Robert, 26 Nov 2026: "Only
 * the languages currently written in").
 */
import { describe, expect, it } from 'vitest';

import { filterLanguageCodes } from './useLanguagesWrittenIn';

describe('the languages a filter offers', () => {
  it('offers only the languages stories are written in', () => {
    expect(filterLanguageCodes(['en', 'ja', 'ro'], [])).toEqual(['en', 'ja', 'ro']);
  });

  it('keeps a language the reader already chose, even with no story in it now', () => {
    expect(filterLanguageCodes(['ro'], ['sv'])).toEqual(['ro', 'sv']);
  });

  it('lists a language once when it is both written in and chosen', () => {
    expect(filterLanguageCodes(['ro', 'en'], ['en'])).toEqual(['ro', 'en']);
  });
});
