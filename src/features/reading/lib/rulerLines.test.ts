/**
 * Tests for the reading ruler's lines (IDEAS-1 part a; IDEA-20261031-8).
 */
import { describe, expect, it } from 'vitest';

import { lineAt, linesFromBoxes, stepLine } from './rulerLines';

describe('the reading ruler', () => {
  it('joins the boxes on one line, such as a bold word beside plain text, into one line', () => {
    const lines = linesFromBoxes([
      { top: 0, bottom: 30 },
      { top: 2, bottom: 29 },
      { top: 32, bottom: 62 },
      { top: 0, bottom: 0 },
    ]);
    expect(lines).toEqual([
      { top: 0, bottom: 30 },
      { top: 32, bottom: 62 },
    ]);
  });

  it('puts the boxes in reading order whatever order they arrive in', () => {
    const lines = linesFromBoxes([
      { top: 64, bottom: 94 },
      { top: 0, bottom: 30 },
    ]);
    expect(lines.map((line) => line.top)).toEqual([0, 64]);
  });

  it('finds the line under the pointer, or the nearest one between paragraphs', () => {
    const lines = [
      { top: 0, bottom: 30 },
      { top: 32, bottom: 62 },
      { top: 100, bottom: 130 },
    ];
    expect(lineAt(lines, 40)).toBe(1);
    expect(lineAt(lines, 90)).toBe(2);
    expect(lineAt(lines, -10)).toBe(0);
    expect(lineAt([], 10)).toBeNull();
  });

  it('moves one line at a time and stops at the first and last line', () => {
    expect(stepLine(0, 1, 3)).toBe(1);
    expect(stepLine(2, 1, 3)).toBe(2);
    expect(stepLine(0, -1, 3)).toBe(0);
  });
});
