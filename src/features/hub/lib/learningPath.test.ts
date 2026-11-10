/**
 * Tests for lib/learningPath.ts: which day comes next, which day an address asks for and how a
 * lesson splits into paragraphs (bundle GAPS-12g).
 */
import { describe, expect, it } from 'vitest';

import { dayFromAddress, lessonParagraphs, nextOpenDay } from './learningPath';

describe('nextOpenDay', () => {
  it('is the first day not yet done, even when a later one is', () => {
    const steps = [
      { day: 1, isDone: true },
      { day: 2, isDone: false },
      { day: 3, isDone: true },
    ];
    expect(nextOpenDay(steps)).toBe(2);
  });

  it('is null when every day is done or there are none', () => {
    expect(nextOpenDay([{ day: 1, isDone: true }])).toBeNull();
    expect(nextOpenDay([])).toBeNull();
  });
});

describe('dayFromAddress', () => {
  it('reads a whole day of the path', () => {
    expect(dayFromAddress('3', 7)).toBe(3);
    expect(dayFromAddress('7', 7)).toBe(7);
  });

  it('refuses a missing value, a day outside the path and anything that is not a number', () => {
    expect(dayFromAddress(null, 7)).toBeNull();
    expect(dayFromAddress('0', 7)).toBeNull();
    expect(dayFromAddress('8', 7)).toBeNull();
    expect(dayFromAddress('3.5', 7)).toBeNull();
    expect(dayFromAddress('<script>', 7)).toBeNull();
  });
});

describe('lessonParagraphs', () => {
  it('splits on blank lines and drops empty paragraphs', () => {
    expect(lessonParagraphs('One.\n\nTwo.\n \n\n  Three. ')).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('keeps a single paragraph whole', () => {
    expect(lessonParagraphs('Only one.')).toEqual(['Only one.']);
  });
});
