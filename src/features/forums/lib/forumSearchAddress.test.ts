/**
 * Tests for the forum search page's address (bundle FORUMS-1, part f; S1-E8-10) and the spaces in
 * its forum filter (FORUMS-2c).
 */
import { describe, expect, it } from 'vitest';

import {
  forumSearchAddress,
  forumSearchFromAddress,
  spaceFilterOptions,
} from './forumSearchAddress';

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

describe('the spaces in the forum filter', () => {
  const circle = { forumSlug: 'space-fantasy-writers-circle', name: 'Fantasy writers’ circle' };
  const labelFor = (name: string) => `Space: ${name}`;

  it('lists each space by name and filters by its forum', () => {
    expect(spaceFilterOptions([circle], labelFor, null)).toEqual([
      { value: 'space-fantasy-writers-circle', label: 'Space: Fantasy writers’ circle' },
    ]);
  });

  it('keeps a space from a shared link that the list doesn’t hold', () => {
    expect(spaceFilterOptions([circle], labelFor, 'space-young-poets').at(-1)).toEqual({
      value: 'space-young-poets',
      label: 'Space: young-poets',
    });
  });

  it('adds nothing for a main forum that is chosen', () => {
    expect(spaceFilterOptions([circle], labelFor, 'first-chapters')).toHaveLength(1);
  });
});
