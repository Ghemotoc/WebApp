/**
 * Tests for the cover title size steps (story S1-E1-03; DoD design rules, covers).
 */
import { describe, expect, it } from 'vitest';

import { coverTitleSize } from './cover-title';

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
