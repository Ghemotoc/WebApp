/**
 * Tests for a space's banner colours (bundle G8b; lib/spaceLook.ts; WCAG 2.2 AA, 1.4.3).
 * The name, description and notes sit on the banner, so the text must read on every colour.
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';

import { deepSpaceBanners, pastelSpaceBanners, spaceBanners } from '../api/spaces';

import { bannerStops, bannerTextColour, pictureScrim } from './spaceLook';

describe('space banners', () => {
  it('offers the fourteen colours of the boards, eight deep and six pastel', () => {
    expect(deepSpaceBanners).toHaveLength(8);
    expect(pastelSpaceBanners).toHaveLength(6);
    expect(new Set(spaceBanners).size).toBe(14);
  });

  it.each(spaceBanners)('text on the %s banner reads at 4.5:1 at both ends', (banner) => {
    const text = bannerTextColour(banner, false);
    for (const stop of bannerStops[banner]) {
      expect(contrastRatio(text, stop)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('puts white text on any uploaded picture, which sits under a dark wash', () => {
    expect(bannerTextColour('butter', true)).toBe('#FFFFFF');
    expect(pictureScrim).toContain('rgba(20,8,28,0.82)');
  });
});
