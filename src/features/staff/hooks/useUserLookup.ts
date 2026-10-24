/**
 * useUserLookup: the Users search (story S1-E11-02).
 *
 * Who calls it: UsersPage. What it calls: api/userManagement.ts lookUpUsers().
 * The search runs when the person asks (the Search button or Enter), not on every key, so each
 * email lookup the database logs is one the person meant (as the account picker, S1-E11-01b).
 * The searched text lives in the address (?q=…), so Back from an account returns to the results.
 */
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  lookUpUsers,
  shortestUserSearch,
  UserManagementError,
  type UserManagementFailure,
  type UserMatch,
} from '../api/userManagement';

import { requireStaffClient } from './requireStaffClient';

/**
 * The reason a call failed, or null.
 *
 * @param error - what the call threw
 * @returns the reason; unreachable for anything that isn't a UserManagementError
 */
export function userFailureOf(error: unknown): UserManagementFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof UserManagementError ? error.failure : 'unreachable';
}

/**
 * Follows one search.
 *
 * @returns the searched text, search(text), the results, whether it is searching, why it failed
 *   and whether the text was too short
 */
export function useUserLookup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchedText = (searchParams.get('q') ?? '').trim();
  const isLongEnough = searchedText.length >= shortestUserSearch;
  const results = useQuery<UserMatch[]>({
    queryKey: ['staff-user-lookup', searchedText],
    enabled: isLongEnough,
    retry: false,
    queryFn: async () => lookUpUsers(await requireStaffClient(), searchedText),
  });

  return {
    searchedText,
    search: (text: string) => setSearchParams(text.trim() === '' ? {} : { q: text.trim() }),
    hasSearched: searchedText !== '',
    isTooShort: searchedText !== '' && !isLongEnough,
    results: results.data ?? [],
    isSearching: results.isFetching,
    failure: userFailureOf(results.error),
  };
}
