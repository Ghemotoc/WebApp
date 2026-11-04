/**
 * Unit tests for the "Why this ad?" words (bundle SPONSORS, part a1, and the sponsor's sentence
 * from part b3; story S1-E12-01 criterion 3).
 * The translation function is a stand-in that shows each key with its values, so the tests check
 * which sentences are chosen and what fills them, not the copy itself.
 */
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type { PageAdSlot } from '@/schemas/ads';

import { languageName, matchedPageParts, whyThisAd } from './whyThisAd';

/** A stand-in for t(): "key" or "key(name=value)", and the default value for category names. */
const fakeT = ((key: string, options?: Record<string, string>) => {
  if (options?.defaultValue !== undefined) return options.defaultValue;
  if (options === undefined) return key;
  const values = Object.entries(options)
    .map(([name, value]) => `${name}=${value}`)
    .join(',');
  return `${key}(${values})`;
}) as unknown as TFunction;

/** A filled slot with a house ad. */
function houseSlot(matched: PageAdSlot['matched']): PageAdSlot {
  return {
    slot_key: 'chapter_end',
    position: 1,
    format: 'wide',
    matched,
    ad: {
      key: 'house:write',
      label: 'house',
      kind: 'write',
      page_slug: null,
      title_ro: null,
      title_en: null,
    },
  };
}

describe('whyThisAd', () => {
  it('names the page language in the reader’s language', () => {
    expect(languageName('ro', 'en')).toBe('Romanian');
  });

  it('lists the category, tag and language the page sent, in that order', () => {
    const parts = matchedPageParts(
      fakeT,
      { category: 'fiction', tag: 'mister', language: 'ro' },
      'en',
    );
    expect(parts).toBe(
      'why.category(name=fiction), why.tag(name=mister), why.language(name=Romanian)',
    );
  });

  it('says a house ad is ours and always ends with the promise', () => {
    const words = whyThisAd(fakeT, houseSlot({ language: 'en' }), 'en');
    expect(words.startsWith('why.ours ')).toBe(true);
    expect(words).toContain('why.matchesParts(parts=why.language(name=English))');
    expect(words.endsWith('why.promise')).toBe(true);
  });

  it('says the ad is chosen from the page only when the page sent nothing', () => {
    expect(whyThisAd(fakeT, houseSlot({}), 'en')).toBe('why.ours why.matchesPage why.promise');
  });

  it('names the sponsor who paid for a sponsored ad, then the page and the promise', () => {
    const slot = houseSlot({ category: 'poetry' });
    const sponsored: PageAdSlot = {
      ...slot,
      ad:
        slot.ad === null
          ? null
          : { ...slot.ad, label: 'sponsored', kind: 'sponsor', sponsor_name: 'Librăria Test' },
    };
    expect(whyThisAd(fakeT, sponsored, 'en')).toBe(
      'why.sponsored(name=Librăria Test) why.matchesParts(parts=why.category(name=poetry)) why.promise',
    );
  });
});
