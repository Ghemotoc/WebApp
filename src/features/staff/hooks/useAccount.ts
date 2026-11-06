/**
 * useAccount: everything the account page reads about one account (story S1-E11-02; screen 8.5).
 *
 * Who calls it: AccountPage. What it calls: api/userManagement.ts (the summary and open cases),
 * the moderation feature's listAccountSanctions() (S1-E10-06) and api/accountSearch.ts
 * revealEmail() (S1-E11-01b). The staff history and the staff notes page through their own rows
 * (hooks/useAccountStaffHistory.ts and hooks/useAccountNotes.ts, LOGS-1).
 * Each part is read only when the summary says the caller's role may see it (architecture 1.8.3),
 * so support never asks for sanctions. The database checks every one again. Every key starts with 'staff-account', so an action can read
 * the whole page again in one go.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { listAccountSanctions } from '@/features/moderation/api/sanctions';

import { revealEmail } from '../api/accountSearch';
import { fetchAccount, fetchOpenCases, UserManagementError } from '../api/userManagement';

import { requireStaffClient } from './requireStaffClient';
import { userFailureOf } from './useUserLookup';

/**
 * Reads the open cases, treating "your role may not see cases" as "no list to show".
 *
 * @param userId - the account
 * @returns the cases, or null for a role without the moderation area
 */
async function openCasesOrHidden(userId: string) {
  try {
    return await fetchOpenCases(await requireStaffClient(), userId);
  } catch (error) {
    if (error instanceof UserManagementError && error.failure === 'not_allowed') return null;
    throw error;
  }
}

/**
 * Follows one account.
 *
 * @param userId - the account, from the address
 * @returns the summary and its failure, the open cases (null when hidden), the sanctions and
 *   showEmail() with the email once shown
 */
export function useAccount(userId: string) {
  const queryClient = useQueryClient();
  const [shownEmail, setShownEmail] = useState<string | null>(null);
  const summary = useQuery({
    queryKey: ['staff-account', userId, 'summary'],
    retry: false,
    queryFn: async () => fetchAccount(await requireStaffClient(), userId),
  });
  const account = summary.data ?? null;
  const openCases = useQuery({
    queryKey: ['staff-account', userId, 'open-cases'],
    enabled: account !== null,
    retry: false,
    queryFn: () => openCasesOrHidden(userId),
  });
  const sanctions = useQuery({
    queryKey: ['staff-account', userId, 'sanctions'],
    enabled: account?.mayViewSanctions === true,
    retry: false,
    queryFn: async () => listAccountSanctions(await requireStaffClient(), userId),
  });
  const reveal = useMutation({
    mutationFn: async () => revealEmail(await requireStaffClient(), userId),
    onSuccess: setShownEmail,
  });

  return {
    account,
    isLoading: summary.isPending,
    failure: userFailureOf(summary.error),
    openCases: openCases.data ?? null,
    sanctions: sanctions.data ?? [],
    showEmail: () => reveal.mutate(),
    shownEmail,
    isShowingEmail: reveal.isPending,
    emailFailed: reveal.isError,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['staff-account', userId] }),
  };
}
