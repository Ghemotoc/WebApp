/**
 * Tests for secondAdPlace: where the Read page's second banner goes (user story 1.4, board A04).
 */
import { describe, expect, it } from 'vitest';

import { secondAdPlace } from './secondAdPlace';

describe('secondAdPlace', () => {
  it('puts the banner between two genre rows when the genres come after the first row', () => {
    expect(secondAdPlace(['following', 'popular', 'categories', 'classics'])).toEqual({
      kind: 'betweenGenres',
    });
  });

  it('puts it after the third row when there are no genre rows and a fourth row follows', () => {
    expect(secondAdPlace(['following', 'popular', 'rising', 'classics'])).toEqual({
      kind: 'afterRow',
      index: 2,
    });
  });

  it('leaves it out when the page has three rows or fewer', () => {
    expect(secondAdPlace(['popular', 'rising', 'classics'])).toEqual({ kind: 'none' });
  });

  it('places it after a row when the genre rows are the first row', () => {
    expect(secondAdPlace(['categories', 'popular', 'rising', 'classics'])).toEqual({
      kind: 'afterRow',
      index: 2,
    });
  });
});
