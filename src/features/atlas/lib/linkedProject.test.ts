/**
 * Tests for the linked project's address rule (story S1-E17-04).
 */
import { describe, expect, it } from 'vitest';

import { isLinkableAddress } from './linkedProject';

describe('a linked project address (S1-E17-04)', () => {
  it('accepts http and https addresses', () => {
    expect(isLinkableAddress('https://example.com/board')).toBe(true);
    expect(isLinkableAddress('http://example.com')).toBe(true);
  });

  it('accepts no address, which removes the link', () => {
    expect(isLinkableAddress('')).toBe(true);
  });

  it('refuses other kinds of address and half-typed ones', () => {
    expect(isLinkableAddress('javascript:alert(1)')).toBe(false);
    expect(isLinkableAddress('ftp://example.com')).toBe(false);
    expect(isLinkableAddress('example.com')).toBe(false);
    expect(isLinkableAddress('https://example .com')).toBe(false);
  });
});
