/**
 * Tests for lib/bibleTags.ts: reading the tags a writer types (S1-E17-18).
 */
import { describe, expect, it } from 'vitest';

import { formatTags, parseTags } from './bibleTags';

describe('parseTags', () => {
  it('splits on commas and trims each tag', () => {
    expect(parseTags('city, north ,  harbour')).toEqual(['city', 'north', 'harbour']);
  });

  it('drops empty pieces and repeats, whatever their capitals', () => {
    expect(parseTags('oraș,, Oraș, nord,')).toEqual(['oraș', 'nord']);
  });

  it('gives no tags for an empty box', () => {
    expect(parseTags('  ')).toEqual([]);
  });
});

describe('formatTags', () => {
  it('writes the tags back with a comma and a space', () => {
    expect(formatTags(['city', 'north'])).toBe('city, north');
  });
});
