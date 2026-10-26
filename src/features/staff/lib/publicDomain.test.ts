/** Tests for the staff form's public-domain check (story S1-E11-16; research G5). */
import { describe, expect, it } from 'vitest';

import { freeMarketsIn } from './publicDomain';

describe('freeMarketsIn', () => {
  it('frees an author who died in 1955 in Romania, the EU and the UK in 2026', () => {
    expect(
      freeMarketsIn({ authorDied: 1955, translatorDied: null, firstPublished: 1920 }, 2026),
    ).toEqual({ RO: true, EU: true, UK: true, US: true });
  });

  it('waits until 2027 for an author who died in 1956', () => {
    expect(
      freeMarketsIn({ authorDied: 1956, translatorDied: null, firstPublished: null }, 2026)?.RO,
    ).toBe(false);
  });

  it('waits for the translator of a translation too', () => {
    expect(
      freeMarketsIn({ authorDied: 1900, translatorDied: 1980, firstPublished: null }, 2026)?.RO,
    ).toBe(false);
  });

  it('says nothing without the author’s year, and leaves the US unknown without a publication year', () => {
    expect(
      freeMarketsIn({ authorDied: null, translatorDied: null, firstPublished: null }, 2026),
    ).toBeNull();
    expect(
      freeMarketsIn({ authorDied: 1900, translatorDied: null, firstPublished: null }, 2026)?.US,
    ).toBeNull();
  });
});
