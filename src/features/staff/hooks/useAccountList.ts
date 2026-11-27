/**
 * useAccountList: the full list of accounts under the Users search, one page at a time, and the
 * "Show" that reveals one account's email (Robert, 26 Nov 2026). The Status filter and the page
 * size live in the page address (lib/accountListParams.ts), beside the search's own text, and
 * changing either goes back to page 1 (Robert, 26 Nov 2026, 20:17 UTC).
 *
 * Who calls it: components/users/AccountList.tsx.
 * What it calls: api/accountList.ts (admin_list_accounts(), owner and admins only, each page read
 * logged) and api/accountSearch.ts's revealEmail() (admin_reveal_email(), logged).
 * Moderators and support are refused by the database; the list then says nothing at all, because
 * the search above is theirs (isAllowed is false).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import type { Enums } from '@/lib/database.types';

import { fetchAccountList, type AccountListPageSize } from '../api/accountList';
import { revealEmail } from '../api/accountSearch';
import { UserManagementError, type UserManagementFailure } from '../api/userManagement';
import {
  accountListChoicesFrom,
  accountListParamsWith,
  type AccountListChoices,
} from '../lib/accountListParams';

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
 * @returns the page on screen, the page number and count, paging, the status and page size with
 *   their setters, whether the caller may see the list at all, a read failure, and
 *   showEmail(userId) with the emails shown so far, by user ID
 */
export function useAccountList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const choices = accountListChoicesFrom(searchParams);
  const [shownEmails, setShownEmails] = useState<Record<string, string>>({});
  /** Puts new choices in the address, keeping the search's text. */
  const showChoices = (next: AccountListChoices) =>
    setSearchParams((current) => accountListParamsWith(current, next));

  // Step 1: the page on screen. No retry: a refusal stays a refusal.
  const page = useQuery({
    queryKey: ['staff-account-list', choices.status, choices.pageSize, choices.pageNumber],
    retry: false,
    queryFn: async () => fetchAccountList(await requireStaffClient(), choices),
  });
  const totalCount = page.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / choices.pageSize));
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
    pageNumber: choices.pageNumber,
    pageCount,
    status: choices.status,
    pageSize: choices.pageSize,
    isLoading: page.isPending,
    isAllowed: readFailure !== 'not_allowed',
    readFailure: readFailure === 'not_allowed' ? null : readFailure,
    showPage: (pageNumber: number) => showChoices({ ...choices, pageNumber }),
    // A new filter or page size starts again on page 1, so no page is ever past the end.
    showStatus: (status: Enums<'account_status'> | null) =>
      showChoices({ ...choices, status, pageNumber: 1 }),
    showPageSize: (pageSize: AccountListPageSize) =>
      showChoices({ ...choices, pageSize, pageNumber: 1 }),
    showEmail: (userId: string) => reveal.mutate(userId),
    shownEmails,
    emailFailed: reveal.isError,
  };
}
