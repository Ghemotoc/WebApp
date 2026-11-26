/**
 * useAccountList: the full list of accounts under the Users search, one page at a time, and the
 * "Show" that reveals one account's email (Robert, 26 Nov 2026).
 *
 * Who calls it: components/users/AccountList.tsx.
 * What it calls: api/accountList.ts (admin_list_accounts(), owner and admins only, each page read
 * logged) and api/accountSearch.ts's revealEmail() (admin_reveal_email(), logged).
 * Moderators and support are refused by the database; the list then says nothing at all, because
 * the search above is theirs (isAllowed is false).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { accountListPageSize, fetchAccountList } from '../api/accountList';
import { revealEmail } from '../api/accountSearch';
import { UserManagementError, type UserManagementFailure } from '../api/userManagement';

import { requireStaffClient } from './requireStaffClient';

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param error - what the call threw, or null
 * @returns the reason; unreachable for anything that isn't a UserManagementError
 */
function failureOf(error: unknown): UserManagementFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof UserManagementError ? error.failure : 'unreachable';
}

/**
 * Follows the full list of accounts.
 *
 * @returns the page on screen, the page number and count, paging, whether the caller may see the
 *   list at all, a read failure, and showEmail(userId) with the emails shown so far, by user ID
 */
export function useAccountList() {
  const [pageNumber, setPageNumber] = useState(1);
  const [shownEmails, setShownEmails] = useState<Record<string, string>>({});

  // Step 1: the page on screen. No retry: a refusal stays a refusal.
  const page = useQuery({
    queryKey: ['staff-account-list', pageNumber],
    retry: false,
    queryFn: async () => fetchAccountList(await requireStaffClient(), pageNumber),
  });
  const totalCount = page.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / accountListPageSize));
  const readFailure = failureOf(page.error);

  // Step 2: "Show" on one row: the database logs it, then the address replaces the mask.
  const reveal = useMutation({
    mutationFn: async (userId: string) => ({
      userId,
      email: await revealEmail(await requireStaffClient(), userId),
    }),
    onSuccess: ({ userId, email }) => setShownEmails((shown) => ({ ...shown, [userId]: email })),
  });

  return {
    accounts: page.data?.accounts ?? [],
    totalCount,
    pageNumber,
    pageCount,
    isLoading: page.isPending,
    isAllowed: readFailure !== 'not_allowed',
    readFailure: readFailure === 'not_allowed' ? null : readFailure,
    showPage: setPageNumber,
    showEmail: (userId: string) => reveal.mutate(userId),
    shownEmails,
    emailFailed: reveal.isError,
  };
}
