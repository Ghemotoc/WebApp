/**
 * Tests for the tag catalogue (CMS-1e): a tag shows in the interface language and a name typed
 * in another language is recognised.
 */
import { describe, expect, it } from 'vitest';

import { findTag, nameIn, tagNameIn, type CatalogueTag } from './tagCatalogue';

const fantasy: CatalogueTag = {
  storedName: 'Fantasy',
  isRecommended: true,
  names: { en: 'Fantasy', ro: 'Fantezie' },
};
const local: CatalogueTag = { storedName: 'Ploiești', isRecommended: false, names: {} };
const catalogue = [fantasy, local];

describe('the tag catalogue', () => {
  it('shows a tag in the interface language', () => {
    expect(nameIn(catalogue, 'Fantasy', 'ro')).toBe('Fantezie');
    expect(nameIn(catalogue, 'Fantasy', 'en-GB')).toBe('Fantasy');
  });

  it('recognises a name typed in another language, ignoring case and diacritics', () => {
    expect(nameIn(catalogue, 'fantézie', 'en')).toBe('Fantasy');
    expect(findTag(catalogue, '  FANTEZIE ')).toBe(fantasy);
  });

  it('falls back to the stored name when a language has no name yet', () => {
    expect(tagNameIn(local, 'en')).toBe('Ploiești');
  });

  it('keeps a name it doesn’t know as typed', () => {
    expect(nameIn(catalogue, 'Lumea bunicii', 'en')).toBe('Lumea bunicii');
    expect(findTag(catalogue, ' ')).toBeUndefined();
  });
});
