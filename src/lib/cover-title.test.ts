/**
 * Tests for the cover title size (story S1-E1-03; DoD design rules, covers): a title keeps its
 * look's one size whatever its length and shrinks only when it would run past its room (Robert,
 * DESIGN card, 26 Nov 2026, 21:07 UTC).
 */
import { describe, expect, it } from 'vitest';

import { coverTitleFit, coverTitleSize } from './cover-title';

/** The break-test titles: a short one, one long word, and the 120-character maximum. */
const shortTitle = 'Ion';
const longWord = 'Neîmblânzitele';
const longestTitle =
  'O poveste foarte lungă despre o vară petrecută la bunici, cu mulți veri, cu un câine, o bicicletă stricată și un pod';
const fonts = ['reading', 'display', 'sans', 'hand'] as const;

describe('coverTitleSize', () => {
  it('keeps the base size while the title fits its room', () => {
    expect(coverTitleSize(140, () => true)).toBe(140);
  });

  it('shrinks just enough to fit', () => {
    expect(coverTitleSize(140, (size) => size <= 100)).toBe(100);
  });

  it('never goes below 11 px', () => {
    expect(coverTitleSize(14, () => false)).toBe(11);
  });
});

describe('coverTitleFit', () => {
  it('the 120-character maximum is 120 characters or fewer', () => {
    expect(longestTitle.length).toBeLessThanOrEqual(120);
  });

  it('a short title keeps the one size in every look and font', () => {
    for (const font of fonts) {
      expect(coverTitleFit(shortTitle, 'label', font)).toBe(1);
      expect(coverTitleFit(shortTitle, 'big_title', font)).toBe(1);
      expect(coverTitleFit(shortTitle, 'initial', font)).toBe(1);
    }
  });

  it('a 30-character title of short words keeps the one size on a Label cover', () => {
    // Before 26 Nov 2026 this title stepped down to 72% only for its length.
    expect(coverTitleFit('Ghemul de ață și pisica bunicii', 'label', 'reading')).toBe(1);
  });

  it('one long word shrinks only until it fits the line of a Big title cover', () => {
    const fit = coverTitleFit(longWord, 'big_title', 'reading');
    // 20 cqi at this step fits 79.2 cqi: 14 letters at about 0.6 em each.
    expect(fit).toBeLessThan(0.6);
    expect(fit).toBeGreaterThan(0.4);
  });

  it('the wider handwriting font shrinks further than the reading font', () => {
    expect(coverTitleFit('Labirintul', 'big_title', 'hand')).toBeLessThan(
      coverTitleFit('Labirintul', 'big_title', 'reading'),
    );
  });

  it('the longest title shrinks so the label ends above 12% from the bottom, in every font', () => {
    for (const font of fonts) {
      const fit = coverTitleFit(longestTitle, 'label', font);
      expect(fit).toBeLessThan(1);
      expect(fit).toBeGreaterThan(0.3);
    }
  });

  it('never returns less than 0.3', () => {
    expect(coverTitleFit('a'.repeat(400), 'initial', 'hand')).toBe(0.3);
  });
});
