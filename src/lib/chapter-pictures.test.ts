/**
 * How pictures are written in a chapter's text (story S1-E3-09; ADR 0005).
 */
import { describe, expect, it } from 'vitest';

import {
  pictureAddress,
  pictureIdFromAddress,
  pictureIdsIn,
  pictureReferencesIn,
} from './chapter-pictures';

const firstId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';
const secondId = '1b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

describe('chapter picture addresses', () => {
  it('reads a picture ID only from a well-formed picture address', () => {
    expect(pictureIdFromAddress(pictureAddress(firstId))).toBe(firstId);
    expect(pictureIdFromAddress('picture:not-an-id')).toBeNull();
    expect(pictureIdFromAddress('https://example.org/x.png')).toBeNull();
    expect(pictureIdFromAddress(undefined)).toBeNull();
  });

  it('finds every picture with its alt text, escapes taken out, as the database does', () => {
    const markdown = `Text\n\n![A map \\] of the \\\\ hills](picture:${firstId})\n\n![](picture:${secondId})`;
    expect(pictureReferencesIn(markdown)).toEqual([
      { pictureId: firstId, alt: 'A map ] of the \\ hills' },
      { pictureId: secondId, alt: '' },
    ]);
  });

  it('lists each picture ID once, in order', () => {
    const markdown = `![a](picture:${secondId})\n\n![b](picture:${firstId})\n\n![c](picture:${secondId})`;
    expect(pictureIdsIn(markdown)).toEqual([secondId, firstId]);
  });
});
