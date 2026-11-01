/**
 * Tests for the paragraph links that notifications open (bundle IDEAS-1, part e).
 */
import { describe, expect, it } from 'vitest';

import { paragraphHash, paragraphPlaceFromHash } from './paragraph-link';

describe('paragraph links', () => {
  it('a paragraph number becomes "#paragraph-4" and back', () => {
    expect(paragraphHash(4)).toBe('#paragraph-4');
    expect(paragraphPlaceFromHash('#paragraph-4')).toBe(4);
  });

  it('the earlier-version thread has its own link', () => {
    expect(paragraphHash('earlier')).toBe('#paragraph-earlier');
    expect(paragraphPlaceFromHash('#paragraph-earlier')).toBe('earlier');
  });

  it('any other hash asks for no thread', () => {
    expect(paragraphPlaceFromHash('')).toBeNull();
    expect(paragraphPlaceFromHash('#resume')).toBeNull();
    expect(paragraphPlaceFromHash('#paragraph-0')).toBeNull();
    expect(paragraphPlaceFromHash('#paragraph-x')).toBeNull();
    expect(paragraphPlaceFromHash('#paragraph-4x')).toBeNull();
  });
});
