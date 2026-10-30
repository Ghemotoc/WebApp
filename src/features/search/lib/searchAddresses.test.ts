/**
 * Unit tests for the search addresses (S1-E5-04).
 */
import { describe, expect, it } from 'vitest';

import { groupAddress, isSearchable, searchAddress } from './searchAddresses';

describe('searchAddress', () => {
  it('puts the term in the address, trimmed and encoded', () => {
    expect(searchAddress('  povești din bloc ')).toBe('/search?q=pove%C8%99ti+din+bloc');
  });

  it('an empty term opens the search page with no term', () => {
    expect(searchAddress('   ')).toBe('/search');
  });
});

describe('groupAddress', () => {
  it('names the group in the path and keeps the term', () => {
    expect(groupAddress('writers', 'ana')).toBe('/search/writers?q=ana');
  });
});

describe('isSearchable', () => {
  it('needs at least 2 letters, not counting spaces at the ends', () => {
    expect(isSearchable(' a ')).toBe(false);
    expect(isSearchable('ab')).toBe(true);
  });
});
