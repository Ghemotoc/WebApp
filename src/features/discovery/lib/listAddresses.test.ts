/**
 * Tests for the story list addresses (stories S1-E5-01, S1-E5-09): every list and filter has an
 * address that opens the same list again.
 */
import { describe, expect, it } from 'vitest';

import {
  listAddress,
  listFromParams,
  plainList,
  requestFromAddress,
  sortFrom,
} from './listAddresses';

describe('listAddress', () => {
  it('gives each Discover shelf its own See all page', () => {
    expect(listAddress(plainList('updated'))).toBe('/discover/all/updated');
    expect(listAddress(plainList('following'))).toBe('/discover/all/following');
  });

  it('gives categories, tags and writers their own pages, with the key made safe for an address', () => {
    expect(listAddress(plainList('category', 'poetry'))).toBe('/discover/c/poetry');
    expect(listAddress(plainList('tag', 'set in Romania'))).toBe('/discover/t/set%20in%20Romania');
    expect(listAddress(plainList('writer', 'inkwolf'))).toBe('/u/inkwolf/stories');
  });

  it('carries the filters and the sort in the query string', () => {
    const address = listAddress({
      ...plainList('tag', 'familie'),
      categorySlug: 'fiction',
      completion: 'completed',
      languageCode: 'ro',
      sortOrder: 'title_az',
    });
    expect(address).toBe(
      '/discover/t/familie?category=fiction&status=completed&language=ro&sort=title_az',
    );
  });
});

describe('requestFromAddress', () => {
  it('reads back the list an address was made from', () => {
    const request = {
      ...plainList('new'),
      completion: 'ongoing' as const,
      languageCode: 'en',
      sortOrder: 'oldest' as const,
    };
    const search = new URL(listAddress(request), 'https://example.test').searchParams;
    expect(requestFromAddress('new', null, search)).toEqual(request);
  });

  it('ignores a status, sort or language it does not know', () => {
    const search = new URLSearchParams('status=paused&sort=random&language=<script>');
    expect(requestFromAddress('updated', null, search)).toEqual(plainList('updated'));
  });

  it('ignores a category filter on a category page, which is its own category', () => {
    const search = new URLSearchParams('category=poetry');
    expect(requestFromAddress('category', 'fiction', search).categorySlug).toBeNull();
  });
});

describe('listFromParams', () => {
  it('finds the list from whichever part of the address is set', () => {
    expect(listFromParams({ listKind: 'completed' })).toEqual({ kind: 'completed', key: null });
    expect(listFromParams({ categorySlug: 'poetry' })).toEqual({ kind: 'category', key: 'poetry' });
    expect(listFromParams({ tag: 'bunici' })).toEqual({ kind: 'tag', key: 'bunici' });
    expect(listFromParams({ handle: 'adult_writer' })).toEqual({
      kind: 'writer',
      key: 'adult_writer',
    });
  });

  it('answers null for a list that does not exist', () => {
    expect(listFromParams({ listKind: 'secret' })).toBeNull();
    expect(listFromParams({ listKind: 'category' })).toBeNull();
  });
});

describe('sortFrom', () => {
  it('knows the six sorts and nothing else', () => {
    expect(sortFrom('writer')).toBe('writer');
    expect(sortFrom('popular')).toBeNull();
    expect(sortFrom(null)).toBeNull();
  });
});
