/**
 * staffStoryFilters: the Staff › Stories search and filters, kept in the page's address
 * (?q=…&status=…) so Back from a story returns to the same list and a link can be shared with a
 * colleague (bundle ADMIN-2, part a; story S1-E11-07).
 *
 * Who calls it: hooks/useStaffStories.ts. What it calls: nothing; plain conversions, so the unit
 * tests can check them without a browser.
 */
import type { Enums } from '@/lib/database.types';

import {
  staffStoryAudiences,
  staffStoryStatuses,
  type StaffStoryFilters,
} from '../api/staffStories';

/** The four ratings, in the order the filter lists them. */
export const staffStoryRatings: Enums<'story_rating'>[] = [
  'all_ages',
  '13_plus',
  '16_plus',
  '18_plus',
];

/**
 * One of the allowed values, or null for anything else (an old or hand-typed address).
 *
 * @param value - what the address holds
 * @param allowed - the values the filter knows
 * @returns the value, or null
 */
function oneOf<Value extends string>(value: string | null, allowed: readonly Value[]) {
  return allowed.find((candidate) => candidate === value) ?? null;
}

/**
 * Reads the filters from the address.
 *
 * @param params - the page's search parameters
 * @returns the filters; anything missing or unknown means "all"
 */
export function staffStoryFiltersFrom(params: URLSearchParams): StaffStoryFilters {
  return {
    searchText: (params.get('q') ?? '').trim(),
    status: oneOf(params.get('status'), staffStoryStatuses),
    categorySlug: params.get('category'),
    languageCode: params.get('language'),
    rating: oneOf(params.get('rating'), staffStoryRatings),
    readableBy: oneOf(params.get('read'), staffStoryAudiences),
    onlyOpenReports: params.get('reports') === 'open',
    onlyMinorWriters: params.get('writers') === 'under18',
  };
}

/**
 * Writes the filters back to the address, leaving out every filter set to "all".
 *
 * @param filters - the filters
 * @param pageNumber - the page, from 0; page 0 is left out
 * @returns the search parameters
 */
export function staffStoryParamsFrom(
  filters: StaffStoryFilters,
  pageNumber: number,
): Record<string, string> {
  // Each pair is [address name, value or null]; only the ones with a value are kept.
  const pairs: [string, string | null][] = [
    ['q', filters.searchText === '' ? null : filters.searchText],
    ['status', filters.status],
    ['category', filters.categorySlug],
    ['language', filters.languageCode],
    ['rating', filters.rating],
    ['read', filters.readableBy],
    ['reports', filters.onlyOpenReports ? 'open' : null],
    ['writers', filters.onlyMinorWriters ? 'under18' : null],
    ['page', pageNumber > 0 ? String(pageNumber + 1) : null],
  ];
  const params: Record<string, string> = {};
  for (const [name, value] of pairs) {
    if (value !== null) params[name] = value;
  }
  return params;
}

/**
 * The page number in the address: people see pages from 1, the database counts from 0.
 *
 * @param params - the page's search parameters
 * @returns the page, from 0
 */
export function staffStoryPageFrom(params: URLSearchParams): number {
  const shown = Number.parseInt(params.get('page') ?? '1', 10);
  return Number.isFinite(shown) && shown > 1 ? shown - 1 : 0;
}
