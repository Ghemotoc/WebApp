/**
 * Tests for the reading list addresses (bundle GAPS-6).
 */
import { describe, expect, it } from 'vitest';

import { isReadingListId, readingListAddress } from './readingListAddress';

describe('readingListAddress', () => {
  it('a list opens at /library/lists/ and its ID', () => {
    expect(readingListAddress('0c701f1c-8102-41d3-b2ac-f11f223b5090')).toBe(
      '/library/lists/0c701f1c-8102-41d3-b2ac-f11f223b5090',
    );
  });
});

describe('isReadingListId', () => {
  it('a row ID is accepted, in either case', () => {
    expect(isReadingListId('0c701f1c-8102-41d3-b2ac-f11f223b5090')).toBe(true);
    expect(isReadingListId('0C701F1C-8102-41D3-B2AC-F11F223B5090')).toBe(true);
  });

  it('a shelf name, a word or nothing is not a list', () => {
    expect(isReadingListId('reading')).toBe(false);
    expect(isReadingListId('<script>')).toBe(false);
    expect(isReadingListId(undefined)).toBe(false);
  });
});
