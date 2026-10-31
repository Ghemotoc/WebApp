/**
 * How music and video cards are written in a chapter's text (story S1-E3-10; ADR 0005).
 */
import { describe, expect, it } from 'vitest';

import {
  embedAddress,
  embedIdFromAddress,
  embedIdsIn,
  embedReferenceCount,
} from './chapter-embeds';

const firstId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';
const secondId = '1b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

describe('chapter card addresses', () => {
  it('reads a card ID only from a well-formed card address', () => {
    expect(embedIdFromAddress(embedAddress(firstId))).toBe(firstId);
    expect(embedIdFromAddress('embed:not-an-id')).toBeNull();
    expect(embedIdFromAddress(`picture:${firstId}`)).toBeNull();
    expect(embedIdFromAddress(null)).toBeNull();
  });

  it('lists each card once but counts a repeated card twice, as the database does', () => {
    const markdown = `![a](embed:${secondId})\n\n![b](embed:${firstId})\n\n![c](embed:${secondId})\n\n![d](picture:${firstId})`;
    expect(embedIdsIn(markdown)).toEqual([secondId, firstId]);
    expect(embedReferenceCount(markdown)).toBe(3);
  });
});
