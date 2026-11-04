/**
 * Tests for the ad slot shapes (bundle SPONSORS, parts a1 and b1; stories S1-E12-01 and S1-E12-02).
 * Who runs it: `npm test`. It checks that our own ads and a sponsor's ad both read, and that the
 * "Sponsored by" credit reads as a name or nothing.
 */
import { describe, expect, it } from 'vitest';

import { pageAdsSchema, sponsorCreditSchema } from './ads';

/** One slot as page_ads() returns it, with the ad given. */
function slotWith(ad: Record<string, unknown>): unknown {
  return {
    slot_key: 'discover_wide',
    position: 1,
    format: 'wide',
    matched: { language: 'ro' },
    ad,
  };
}

describe('the ad slot shapes', () => {
  it('reads one of our own ads without any sponsor fields', () => {
    const [slot] = pageAdsSchema.parse([
      slotWith({
        key: 'house:write',
        label: 'house',
        kind: 'write',
        page_slug: null,
        title_ro: null,
        title_en: null,
      }),
    ]);
    expect(slot?.ad?.sponsor_name).toBeUndefined();
  });

  it('reads a sponsor’s ad with its name, words, picture, link and code', () => {
    const [slot] = pageAdsSchema.parse([
      slotWith({
        key: 'campaign:1',
        label: 'sponsored',
        kind: 'sponsor',
        page_slug: null,
        title_ro: null,
        title_en: null,
        sponsor_name: 'Librăria Test',
        text_en: 'Get a free library card this week.',
        alt_en: 'A girl reading in a library.',
        picture_bucket: 'sponsor-creatives',
        picture_path: 'a/b.png',
        link_url: 'https://librarie.example/permis',
        discount_code: null,
      }),
    ]);
    expect(slot?.ad?.label).toBe('sponsored');
    expect(slot?.ad?.sponsor_name).toBe('Librăria Test');
    expect(slot?.ad?.discount_code).toBeNull();
  });

  it('reads "Sponsored by" as a name, or nothing when nobody sponsors it', () => {
    expect(sponsorCreditSchema.parse({ sponsor_name: 'Librăria Test', link_url: null })).toEqual({
      sponsor_name: 'Librăria Test',
      link_url: null,
    });
    expect(sponsorCreditSchema.parse(null)).toBeNull();
  });
});
