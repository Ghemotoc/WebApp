/**
 * useAccountSearch: the account picker's search and "Show email" (story S1-E11-01b).
 *
 * Who calls it: AccountPicker. What it calls: api/accountSearch.ts.
 * The search runs when the person asks (the Search button or Enter), not on every key, so each
 * email lookup the database logs is one the person meant.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import { findAccounts, revealEmail, shortestSearch, type AccountMatch } from '../api/accountSearch';
import { StaffChangeError, type StaffChangeFailure } from '../api/staffRoles';

/**
 * Gets the shared client, or fails in plain words when the app has no database settings.
 *
 * @returns the client
 */
async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new StaffChangeError('unreachable');
  return client;
}

/**
 * The reason a search failed, or null.
 *
 * @param error - what the search threw
 * @returns the reason; unreachable for anything that isn't a StaffChangeError
 */
function failureOf(error: unknown): StaffChangeFailure | null {
  if (error === null) return null;
  return error instanceof StaffChangeError ? error.failure : 'unreachable';
}

/**
 * Follows one search and the emails shown so far.
 *
 * @returns search(text), the results, whether it is searching, why it failed, whether the text
 *   was too short, revealEmail(userId) and the emails shown, by user ID
 */
export function useAccountSearch() {
  const [searchedText, setSearchedText] = useState<string | null>(null);
  const [shownEmails, setShownEmails] = useState<Record<string, string>>({});
  const results = useQuery<AccountMatch[]>({
    queryKey: ['staff-account-search', searchedText],
    enabled: searchedText !== null && searchedText.length >= shortestSearch,
    retry: false,
    queryFn: async () => findAccounts(await requireClient(), searchedText ?? ''),
  });
  const reveal = useMutation({
    mutationFn: async (userId: string) => ({
      userId,
      email: await revealEmail(await requireClient(), userId),
    }),
    onSuccess: ({ userId, email }) => setShownEmails((shown) => ({ ...shown, [userId]: email })),
  });

  return {
    search: (text: string) => setSearchedText(text.trim()),
    hasSearched: searchedText !== null,
    isTooShort: searchedText !== null && searchedText.length < shortestSearch,
    results: results.data ?? [],
    isSearching: results.isFetching,
    searchFailure: failureOf(results.error),
    revealEmail: (userId: string) => reveal.mutate(userId),
    shownEmails,
    revealFailure: failureOf(reveal.error),
  };
}
