/**
 * Tests for usePageScrolled's rule (bundle 5, board D05): the top bar tightens past 26 px and
 * relaxes at 12 px, so the 14 px the browser scrolls back when the bar changes never flip it again.
 */
import { describe, expect, it } from 'vitest';

import { scrolledThreshold, shouldBeTight, tightBarShrink } from './usePageScrolled';

describe('shouldBeTight', () => {
  it('keeps a roomy bar roomy until the page has scrolled past 26 px', () => {
    expect(shouldBeTight(0, false)).toBe(false);
    expect(shouldBeTight(13, false)).toBe(false);
    expect(shouldBeTight(26, false)).toBe(false);
    expect(shouldBeTight(27, false)).toBe(true);
  });

  it('keeps a tight bar tight until the page is back at 12 px or less', () => {
    expect(shouldBeTight(400, true)).toBe(true);
    expect(shouldBeTight(13, true)).toBe(true);
    expect(shouldBeTight(12, true)).toBe(false);
  });

  it('stays put after the browser scrolls back the 14 px a change moves the page', () => {
    // Tightening just past 26 px moves the page up 14 px: the bar must stay tight there.
    const afterTightening = scrolledThreshold + tightBarShrink + 1 - tightBarShrink;
    expect(shouldBeTight(afterTightening, true)).toBe(true);
    // Relaxing at 12 px moves the page down 14 px: the bar must stay roomy there.
    const afterRelaxing = scrolledThreshold + tightBarShrink;
    expect(shouldBeTight(afterRelaxing, false)).toBe(false);
  });
});
