/**
 * useStaffStories: the Staff › Stories list (bundle ADMIN-2, part a; story S1-E11-07).
 *
 * Who calls it: StaffStoriesPage. What it calls: api/staffStories.ts searchStaffStories().
 * The search and filters live in the address (lib/staffStoryFilters.ts), so Back from a story
 * returns to the same list. Changing a filter goes back to the first page.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  searchStaffStories,
  StaffStoryError,
  type StaffStoryFailure,
  type StaffStoryFilters,
  type StaffStoryPage,
} from '../api/staffStories';
import {
  staffStoryFiltersFrom,
  staffStoryPageFrom,
  staffStoryParamsFrom,
} from '../lib/staffStoryFilters';

import { requireStaffClient } from './requireStaffClient';

/**
 * The reason a call failed, or null.
 *
 * @param error - what the call threw
 * @returns the reason; unreachable for anything that isn't a StaffStoryError
 */
export function staffStoryFailureOf(error: unknown): StaffStoryFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof StaffStoryError ? error.failure : 'unreachable';
}

/**
 * Follows the list.
 *
 * @returns the filters, setFilters(), the page number, goToPage(), the page of stories (null
 *   while loading), whether it is loading and why it failed
 */
export function useStaffStories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = staffStoryFiltersFrom(searchParams);
  const pageNumber = staffStoryPageFrom(searchParams);
  const page = useQuery<StaffStoryPage>({
    queryKey: ['staff-stories', filters, pageNumber],
    retry: false,
    // The old page stays on screen while the next one loads, so the table doesn't jump.
    placeholderData: keepPreviousData,
    queryFn: async () => searchStaffStories(await requireStaffClient(), filters, pageNumber),
  });

  return {
    filters,
    pageNumber,
    setFilters: (next: StaffStoryFilters) => setSearchParams(staffStoryParamsFrom(next, 0)),
    goToPage: (next: number) => setSearchParams(staffStoryParamsFrom(filters, next)),
    page: page.data ?? null,
    isLoading: page.isFetching,
    failure: staffStoryFailureOf(page.error),
  };
}
