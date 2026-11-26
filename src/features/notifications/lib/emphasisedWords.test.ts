/**
 * Tests for emphasisedWords (user story 4.1, board E11-Notifications): the titles in a row are
 * set apart, and nothing else is.
 */
import { describe, expect, it } from 'vitest';

import { emphasisedWords } from './emphasisedWords';

describe('emphasisedWords', () => {
  it('sets the story title apart in a new chapter row', () => {
    expect(
      emphasisedWords('published Chapter 15 of The Salt Mine Choir.', ['The Salt Mine Choir']),
    ).toEqual([
      { text: 'published Chapter 15 of ', isTitle: false },
      { text: 'The Salt Mine Choir', isTitle: true },
      { text: '.', isTitle: false },
    ]);
  });

  it('leaves a sentence with no title as one plain piece', () => {
    expect(emphasisedWords('started following you.', ['Small Rooms'])).toEqual([
      { text: 'started following you.', isTitle: false },
    ]);
  });

  it('sets apart only the first place a title appears', () => {
    const pieces = emphasisedWords('Rain in Rain', ['Rain']);
    expect(pieces.filter((piece) => piece.isTitle)).toHaveLength(1);
    expect(pieces.map((piece) => piece.text).join('')).toBe('Rain in Rain');
  });
});
