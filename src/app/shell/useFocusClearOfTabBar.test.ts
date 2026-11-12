/**
 * Tests for scrollNeededToClearBar (GLASS-4 follow-up): how far the page moves so a focused
 * control is not hidden under the floating tab bar (WCAG 2.2, 2.4.11).
 */
import { describe, expect, it } from 'vitest';

import { scrollNeededToClearBar } from './useFocusClearOfTabBar';

describe('scrollNeededToClearBar', () => {
  it('leaves the page alone when the control sits well above the bar', () => {
    expect(scrollNeededToClearBar({ top: 200, bottom: 244 }, 520)).toBe(0);
  });

  it('scrolls a control under the bar up by the hidden amount plus a little air', () => {
    // The bar starts at 520, so the control must end by 508: 560 - 508 = 52.
    expect(scrollNeededToClearBar({ top: 516, bottom: 560 }, 520)).toBe(52);
  });

  it('scrolls a control that only touches the air above the bar', () => {
    expect(scrollNeededToClearBar({ top: 470, bottom: 514 }, 520)).toBe(6);
  });

  it('never pushes the top of a tall control under the header', () => {
    // A 500 px tall box starting 100 px down can move up by 12 px only (100 - 88).
    expect(scrollNeededToClearBar({ top: 100, bottom: 600 }, 520)).toBe(12);
  });

  it('does not scroll backwards when the control already starts under the header', () => {
    expect(scrollNeededToClearBar({ top: 40, bottom: 600 }, 520)).toBe(0);
  });
});
