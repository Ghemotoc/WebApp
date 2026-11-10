/**
 * Tests for reading a thread's number from what a moderator types (bundle GAPS-9).
 */
import { describe, expect, it } from 'vitest';

import { postAddress, threadNumberFrom } from './forumAddresses';

describe('threadNumberFrom', () => {
  it('reads a bare number', () => {
    expect(threadNumberFrom(' 412 ')).toBe(412);
  });

  it('reads the number from a pasted thread address, with or without a post', () => {
    expect(threadNumberFrom('https://example.test/forums/first-chapters/412')).toBe(412);
    expect(threadNumberFrom('/forums/space-fantasy-circle/7?post=3')).toBe(7);
    expect(threadNumberFrom(postAddress('first-chapters', 9, 2))).toBe(9);
  });

  it('refuses anything else', () => {
    for (const text of [
      '',
      '0',
      '-3',
      '4.5',
      'abc',
      '12 13',
      '/forums/first-chapters',
      '/s/story/12',
    ])
      expect(threadNumberFrom(text)).toBeNull();
  });
});
