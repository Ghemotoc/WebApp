/**
 * Tests for the quote card's text layout (story S1-E4-07).
 */
import { describe, expect, it } from 'vitest';

import { paletteBackgrounds, purpleBackground, quoteFontSize, wrapLines } from './quoteCard';

/** A fake measure: every character is 10 px wide. */
const tenPerCharacter = (text: string) => Array.from(text).length * 10;

describe('wrapLines', () => {
  it('breaks on spaces so no line is wider than allowed', () => {
    const lines = wrapLines('There was no Ilie there was no name', 120, tenPerCharacter);
    expect(lines).toEqual(['There was no', 'Ilie there', 'was no name']);
    for (const line of lines) expect(tenPerCharacter(line)).toBeLessThanOrEqual(120);
  });

  it('cuts a word that is wider than a whole line', () => {
    expect(wrapLines('abcdefghij', 40, tenPerCharacter)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('gives no lines for empty text', () => {
    expect(wrapLines('', 100, tenPerCharacter)).toEqual([]);
  });
});

describe('quoteFontSize', () => {
  it('makes shorter quotes bigger', () => {
    expect(quoteFontSize('Scurt.')).toBe(64);
    expect(quoteFontSize('a'.repeat(120))).toBe(52);
    expect(quoteFontSize('a'.repeat(280))).toBe(44);
  });
});

describe('backgrounds', () => {
  it("defaults to the brand purple and offers the board's nine colours", () => {
    expect(purpleBackground.key).toBe('purple');
    expect(paletteBackgrounds.map((background) => background.key)).toEqual([
      'plum',
      'violet',
      'gold',
      'ink',
      'lilac',
      'blush',
      'sky',
      'sage',
      'paper',
    ]);
  });
});
