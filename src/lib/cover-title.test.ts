/**
 * Tests for the cover title size steps (story S1-E1-03; DoD design rules, covers).
 */
import { describe, expect, it } from 'vitest';

import { coverTitleFit, coverTitleSize } from './cover-title';

describe('coverTitleSize', () => {
  it('keeps the base size for titles up to 18 characters', () => {
    expect(coverTitleSize('Ghemul de ață', 21)).toBe(21);
    expect(coverTitleSize('a'.repeat(18), 21)).toBe(21);
  });

  it('steps down to 85% from 19 to 28 characters', () => {
    expect(coverTitleSize('a'.repeat(19), 20)).toBe(17);
    expect(coverTitleSize('a'.repeat(28), 20)).toBe(17);
  });

  it('steps down to 72% from 29 to 40 characters', () => {
    expect(coverTitleSize('a'.repeat(29), 25)).toBe(18);
  });

  it('steps down to 62% for longer titles', () => {
    expect(coverTitleSize('a'.repeat(41), 25)).toBe(15.5);
  });

  it('never goes below 11 px, even on a small thumbnail', () => {
    expect(coverTitleSize('a'.repeat(80), 14)).toBe(11);
  });
});

describe('coverTitleFit', () => {
  it('keeps the length step for a short title of short words', () => {
    expect(coverTitleFit('Ghemul de ață', 'label', 'reading')).toBe(1);
  });

  it('steps down until one long word fits the line of a Big title cover', () => {
    const fit = coverTitleFit('Neîmblânzitele', 'big_title', 'reading');
    // 20 cqi at this step fits 79.2 cqi: 14 letters at about 0.6 em each.
    expect(fit).toBeLessThan(0.6);
    expect(fit).toBeGreaterThan(0.4);
  });

  it('steps down further for the wider handwriting font', () => {
    expect(coverTitleFit('Labirintul', 'big_title', 'hand')).toBeLessThan(
      coverTitleFit('Labirintul', 'big_title', 'reading'),
    );
  });

  it('steps a long title below the length step so the pen name stays on a Big title cover', () => {
    const longTitle =
      'O poveste foarte lungă despre o vară petrecută la bunici, cu mulți veri, cu un câine și o bicicletă stricată';
    expect(coverTitleFit(longTitle, 'big_title', 'sans')).toBeLessThan(0.62);
  });

  it('never returns less than 0.3', () => {
    expect(coverTitleFit('a'.repeat(400), 'initial', 'hand')).toBe(0.3);
  });
});
