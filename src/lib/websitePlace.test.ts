/**
 * Tests for websitePlace: the country and language at the start of a website address
 * (bundle LOCALISE-1).
 */
import { describe, expect, it } from 'vitest';

import {
  fallbackPlace,
  isKnownPlace,
  isWebsitePagePath,
  pathAtPlace,
  pathWithoutPlace,
  placeForVisitor,
  placeInInterfaceLanguage,
  placeOfPath,
  type WebsiteMarket,
} from './websitePlace';

const markets: WebsiteMarket[] = [
  { countryCode: 'RO', languages: ['ro', 'en'], isOpen: true },
  { countryCode: 'SE', languages: ['sv', 'en'], isOpen: false },
  { countryCode: 'GB', languages: ['en'], isOpen: false },
];

describe('placeOfPath', () => {
  it('reads the country and language from the start of an address', () => {
    expect(placeOfPath('/se/sv/help')).toEqual({ country: 'se', language: 'sv' });
    expect(placeOfPath('/ro/en')).toEqual({ country: 'ro', language: 'en' });
  });

  it('finds no place in an app address', () => {
    expect(placeOfPath('/discover')).toBeNull();
    expect(placeOfPath('/s/a-story/abcd1234')).toBeNull();
    expect(placeOfPath('/help/reporting')).toBeNull();
    expect(placeOfPath('/settings')).toBeNull();
    expect(placeOfPath('/SE/sv')).toBeNull();
  });
});

describe('pathWithoutPlace and pathAtPlace', () => {
  it('takes the place off and puts it back', () => {
    expect(pathWithoutPlace('/se/sv/help/reporting')).toBe('/help/reporting');
    expect(pathWithoutPlace('/se/sv')).toBe('/');
    expect(pathWithoutPlace('/discover')).toBe('/discover');
    expect(pathAtPlace({ country: 'se', language: 'sv' }, '/help/reporting')).toBe(
      '/se/sv/help/reporting',
    );
    expect(pathAtPlace({ country: 'se', language: 'sv' }, '/')).toBe('/se/sv');
  });

  it('keeps a query or a place on the page', () => {
    expect(pathAtPlace({ country: 'ro', language: 'ro' }, '/#questions')).toBe('/ro/ro#questions');
    expect(pathAtPlace({ country: 'ro', language: 'ro' }, '/help?q=cont')).toBe(
      '/ro/ro/help?q=cont',
    );
  });
});

describe('isWebsitePagePath', () => {
  it('knows the website pages from the app pages', () => {
    expect(isWebsitePagePath('/')).toBe(true);
    expect(isWebsitePagePath('/#questions')).toBe(true);
    expect(isWebsitePagePath('/help')).toBe(true);
    expect(isWebsitePagePath('/help/reporting')).toBe(true);
    expect(isWebsitePagePath('/c/autumn-contest')).toBe(true);
    expect(isWebsitePagePath('/helpers')).toBe(false);
    expect(isWebsitePagePath('/discover')).toBe(false);
    expect(isWebsitePagePath('/legal/terms')).toBe(false);
  });
});

describe('isKnownPlace', () => {
  it('accepts a market in one of its languages only', () => {
    expect(isKnownPlace(markets, { country: 'se', language: 'sv' })).toBe(true);
    expect(isKnownPlace(markets, { country: 'se', language: 'ro' })).toBe(false);
    expect(isKnownPlace(markets, { country: 'fr', language: 'en' })).toBe(false);
  });
});

describe('placeForVisitor', () => {
  it('gives a visitor their market in their language', () => {
    expect(placeForVisitor(markets, 'SE', 'sv')).toEqual({ country: 'se', language: 'sv' });
    expect(placeForVisitor(markets, 'ro', 'en')).toEqual({ country: 'ro', language: 'en' });
  });

  it('gives English when the market lacks their language', () => {
    expect(placeForVisitor(markets, 'SE', 'ro')).toEqual({ country: 'se', language: 'en' });
  });

  it('gives the market its first language when the language is unknown', () => {
    expect(placeForVisitor(markets, 'SE', null)).toEqual({ country: 'se', language: 'sv' });
  });

  it('gives a country with no market the fallback place, in their language when it has it', () => {
    expect(placeForVisitor(markets, 'FR', 'en')).toEqual(fallbackPlace);
    expect(placeForVisitor(markets, 'FR', 'sv')).toEqual(fallbackPlace);
    expect(placeForVisitor(markets, null, null)).toEqual(fallbackPlace);
    expect(placeForVisitor(markets, null, 'ro')).toEqual({ country: 'ro', language: 'ro' });
  });
});

describe('placeInInterfaceLanguage', () => {
  it('moves the address to the interface language when the market offers it', () => {
    expect(placeInInterfaceLanguage(markets, { country: 'ro', language: 'en' }, 'ro')).toEqual({
      country: 'ro',
      language: 'ro',
    });
  });

  it('leaves the address alone when it matches or the market lacks that language', () => {
    expect(placeInInterfaceLanguage(markets, { country: 'ro', language: 'ro' }, 'ro')).toBeNull();
    expect(placeInInterfaceLanguage(markets, { country: 'se', language: 'sv' }, 'ro')).toBeNull();
  });
});
