/**
 * Tests for the story lists' language filter (bundle MARKETS-2, part c; IDEA-20261109-2): the
 * lists on Discover, the genre pages and See all show the languages someone reads, a language
 * picked in the filter wins, and "Any language" turns the filter off. The database side is in
 * supabase/tests/database/358-reading-languages.test.sql. Also "Popular in" a country (MARKETS-2d;
 * database side in 359-popular-in-country.test.sql).
 *
 * Who runs it: `npm test`.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { plainList } from '../lib/listAddresses';

import {
  everyLanguage,
  everywhereRanking,
  fetchStoryList,
  popularInFor,
  followsReadingLanguages,
  languageFilterFor,
} from './storyLists';

describe('the language filter a list sends', () => {
  it('sends the languages someone reads on Discover’s lists, separated by commas', () => {
    expect(languageFilterFor(plainList('updated'), ['sv', 'en'])).toBe('sv,en');
  });

  it('lets a language picked in the filter win', () => {
    expect(languageFilterFor({ ...plainList('popular'), languageCode: 'ro' }, ['sv', 'en'])).toBe(
      'ro',
    );
  });

  it('turns the filter off for "Any language"', () => {
    expect(
      languageFilterFor({ ...plainList('updated'), languageCode: everyLanguage }, ['sv']),
    ).toBeNull();
  });

  it('shows every language in a library, a reading list, a writer’s page and search', () => {
    expect(followsReadingLanguages('library')).toBe(false);
    expect(followsReadingLanguages('reading_list')).toBe(false);
    expect(followsReadingLanguages('writer')).toBe(false);
    expect(followsReadingLanguages('search')).toBe(false);
    expect(languageFilterFor({ ...plainList('writer'), key: 'lia' }, ['sv'])).toBeNull();
  });

  it('asks browse_stories() for the languages someone reads', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { total: 0, stories: [] }, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;
    await fetchStoryList(client, plainList('new'), {
      pageSize: 21,
      offset: 0,
      readingLanguages: ['da', 'en'],
    });
    expect(rpc).toHaveBeenCalledWith('browse_stories', {
      list_kind: 'new',
      language: 'da,en',
      page_size: 21,
      page_offset: 0,
    });
  });
});

describe('"Popular in" a country (MARKETS-2d)', () => {
  it('asks for a country only on the popular list, and never for "Everywhere"', () => {
    expect(popularInFor({ ...plainList('popular'), popularIn: 'SE' })).toBe('SE');
    expect(popularInFor({ ...plainList('popular'), popularIn: everywhereRanking })).toBeNull();
    expect(popularInFor({ ...plainList('updated'), popularIn: 'SE' })).toBeNull();
    expect(popularInFor({ ...plainList('popular'), popularIn: 'se' })).toBeNull();
  });

  it('sends the country and says which ranking came back', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { total: 0, stories: [], popular_in: null }, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;
    const page = await fetchStoryList(
      client,
      { ...plainList('popular'), popularIn: 'NO' },
      { pageSize: 21, offset: 0 },
    );
    expect(rpc).toHaveBeenCalledWith('browse_stories', {
      list_kind: 'popular',
      popular_in: 'NO',
      page_size: 21,
      page_offset: 0,
    });
    expect(page.popularIn).toBeNull();
  });
});
