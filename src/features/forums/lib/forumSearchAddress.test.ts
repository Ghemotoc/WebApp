/**
 * Tests for the forum search page's address (bundle FORUMS-1, part f; S1-E8-10).
 */
import { describe, expect, it } from 'vitest';

import { forumSearchAddress, forumSearchFromAddress } from './forumSearchAddress';

describe('the forum search address', () => {
  it('leaves empty filters out of the address', () => {
    expect(forumSearchAddress({ term: ' dragoni ', forumSlug: null, authorHandle: ' ' })).toBe(
      '/forums/search?q=dragoni',
    );
  });

  it('reads back what it wrote', () => {
    const address = forumSearchAddress({
      term: 'hărți',
      forumSlug: 'worldbuilding',
      authorHandle: '@teacher',
    });
    const parameters = new URL(address, 'https://example.org').searchParams;
    expect(forumSearchFromAddress(parameters)).toEqual({
      term: 'hărți',
      forumSlug: 'worldbuilding',
      authorHandle: '@teacher',
    });
  });
});
