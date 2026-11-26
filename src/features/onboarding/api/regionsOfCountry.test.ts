/**
 * Tests for the county list that follows the person's country (COUNTRY-2, trial bug, 26 Nov 2026).
 *
 * What they cover: regionsOfCountry() and shownRegionCode() in api/onboarding.ts, which step 1
 * and Settings › What you like use to offer only the counties of the country on the profile.
 */
import { describe, expect, it } from 'vitest';

import { regionsOfCountry, shownRegionCode, type Region } from './onboarding';

/** Two Romanian counties and one county of another country. */
const regions: Region[] = [
  { code: 'RO-CJ', countryCode: 'RO', nameRo: 'Cluj', nameEn: 'Cluj' },
  { code: 'RO-B', countryCode: 'RO', nameRo: 'București', nameEn: 'Bucharest' },
  { code: 'MD-CU', countryCode: 'MD', nameRo: 'Chișinău', nameEn: 'Chișinău' },
];

describe('regionsOfCountry', () => {
  it('a person in Romania is offered only Romania’s counties', () => {
    expect(regionsOfCountry(regions, 'RO').map((region) => region.code)).toEqual(['RO-CJ', 'RO-B']);
  });

  it('a person in Sweden is offered no counties', () => {
    expect(regionsOfCountry(regions, 'SE')).toEqual([]);
  });

  it('a person whose country is unknown is offered no counties', () => {
    expect(regionsOfCountry(regions, null)).toEqual([]);
  });
});

describe('shownRegionCode', () => {
  it('a saved county that is offered stays chosen', () => {
    expect(shownRegionCode(regionsOfCountry(regions, 'RO'), 'RO-CJ')).toBe('RO-CJ');
  });

  it('a saved county of another country shows as “I’d rather not say”', () => {
    expect(shownRegionCode(regionsOfCountry(regions, 'SE'), 'RO-CJ')).toBe('');
  });
});
