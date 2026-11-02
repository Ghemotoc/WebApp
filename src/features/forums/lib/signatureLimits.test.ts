/** Tests for the signature counter (story S1-E8-08 criterion 1). */
import { describe, expect, it } from 'vitest';

import { countSignature } from './signatureLimits';

describe('countSignature', () => {
  it('three lines within 300 characters are within the limits', () => {
    const count = countSignature('Writing.\nFridays.\nMaps.');
    expect(count).toEqual({ characters: 23, lines: 3, isTooLong: false, hasTooManyLines: false });
  });

  it('a fourth line is one too many', () => {
    expect(countSignature('a\nb\nc\nd').hasTooManyLines).toBe(true);
  });

  it('301 characters are too long, and Romanian letters count as one each', () => {
    expect(countSignature('ș'.repeat(300)).isTooLong).toBe(false);
    expect(countSignature('a'.repeat(301)).isTooLong).toBe(true);
  });

  it('spaces and empty lines around the words are not counted, as when it is saved', () => {
    expect(countSignature('  \n Hello \n\n')).toEqual({
      characters: 5,
      lines: 1,
      isTooLong: false,
      hasTooManyLines: false,
    });
  });
});
