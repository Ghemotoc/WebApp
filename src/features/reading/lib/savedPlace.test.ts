/**
 * Tests for where to scroll for a saved reading place (story S1-E4-03).
 */
import { describe, expect, it } from 'vitest';

import { progressThrough } from '../hooks/useReadingProgress';

import { scrollTopForPlace } from './savedPlace';

describe('scrollTopForPlace', () => {
  it('brings the saved line to the bottom of the window, as the progress line measures it', () => {
    // A 4000 px text starting 300 px down the page, in an 800 px window, saved at 45%.
    const top = scrollTopForPlace(300, 4000, 800, 45);
    expect(top).toBe(1300);
    // After scrolling there, the text's top is 300 - 1300 from the window's top: 45% read.
    expect(progressThrough(300 - top, 4000, 800)).toBe(45);
  });

  it('never scrolls above the top of the page', () => {
    expect(scrollTopForPlace(100, 1000, 900, 5)).toBe(0);
  });
});
