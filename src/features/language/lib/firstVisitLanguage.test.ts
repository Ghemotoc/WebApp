/**
 * Tests for firstVisitLanguage (bundle MARKETS-2, part a; story S1-E11-31): the language a visitor
 * sees on a first visit, from their connection's country.
 */
import { describe, expect, it } from 'vitest';

import { firstVisitLanguage } from './firstVisitLanguage';

describe('firstVisitLanguage', () => {
  it('a Swedish visitor reads in English while Swedish is closed', () => {
    expect(firstVisitLanguage('SE', ['en', 'ro'])).toBe('en');
  });

  it('a Swedish visitor reads in Swedish once staff open it', () => {
    expect(firstVisitLanguage('SE', ['en', 'ro', 'sv'])).toBe('sv');
  });

  it('Danish and Norwegian visitors get their own open language', () => {
    expect(firstVisitLanguage('DK', ['en', 'ro', 'da'])).toBe('da');
    expect(firstVisitLanguage('NO', ['en', 'ro', 'nb'])).toBe('nb');
  });

  it('a Norwegian visitor doesn’t get Swedish just because Swedish is open', () => {
    expect(firstVisitLanguage('NO', ['en', 'ro', 'sv'])).toBe('en');
  });

  it('visitors from Romania and Moldova keep Romanian first', () => {
    expect(firstVisitLanguage('RO', ['en', 'ro', 'sv'])).toBe('ro');
    expect(firstVisitLanguage('MD', ['en', 'ro'])).toBe('ro');
  });

  it('a visitor from an English-speaking country reads in English', () => {
    expect(firstVisitLanguage('GB', ['en', 'ro'])).toBe('en');
    expect(firstVisitLanguage('US', ['en', 'ro'])).toBe('en');
  });

  it('an unknown country changes nothing, so the default stays', () => {
    expect(firstVisitLanguage(null, ['en', 'ro'])).toBeNull();
  });
});
