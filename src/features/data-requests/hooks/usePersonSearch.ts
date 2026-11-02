/**
 * usePersonSearch: finds the account a new data request is about, by username, pen name, whole
 * email address or user ID (bundle ADMIN-2, part c1; story S1-E11-09 criterion 1).
 *
 * Who calls it: DataRequestPersonPicker. What it calls: the Users look-up,
 * admin_user_lookup() (S1-E11-02), through src/features/staff/api/userManagement.ts. That function
 * lets owner, admin and support search, and logs each search by email as a sensitive read
 * (architecture 1.8.3). The search runs only when staff press Search, so each logged look-up is
 * one they meant.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';
import {
  lookUpUsers,
  shortestUserSearch,
  UserManagementError,
  type UserMatch,
} from '@/features/staff/api/userManagement';

/**
 * Follows one search.
 *
 * @returns search(text), the matches, whether it searched, is searching, failed or was too short
 */
export function usePersonSearch() {
  const [searchedText, setSearchedText] = useState('');
  const isLongEnough = searchedText.length >= shortestUserSearch;
  const results = useQuery<UserMatch[]>({
    queryKey: ['data-request-person', searchedText],
    enabled: isLongEnough,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new UserManagementError('unreachable');
      return lookUpUsers(client, searchedText);
    },
  });
  return {
    search: (text: string) => setSearchedText(text.trim()),
    hasSearched: searchedText !== '',
    isTooShort: searchedText !== '' && !isLongEnough,
    matches: results.data ?? [],
    isSearching: results.isFetching,
    hasFailed: results.isError,
  };
}
