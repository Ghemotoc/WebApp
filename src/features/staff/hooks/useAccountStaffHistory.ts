/**
 * useAccountStaffHistory: the account page's "Staff actions" section: every audit row about the
 * account, 20 to a page (bundle LOGS-1, part b; Robert, 6 Nov 2026: on every profile "a log …
 * for whatever action our staff has done").
 *
 * Who calls it: components/users/AccountStaffHistory.tsx, only for owner and admin, the roles
 * that may read the audit log (architecture 1.8.3); the database refuses everyone else anyway.
 * What it calls: api/auditLog.ts searchAuditLog() with the account as the target, the same
 * admin_search_audit_log() the Audit log page uses (S1-E11-01).
 * The function gives no total, so "is there another page?" means "was this page full?". When the
 * last page is exactly full, the next one says "nothing more" instead of showing a dead button.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AuditLogError, emptyFilters, searchAuditLog, type AuditLogFailure } from '../api/auditLog';

import { requireStaffClient } from './requireStaffClient';

/** How many rows one page of the account's history holds. */
export const accountHistoryPageSize = 20;

/**
 * The reason a read failed, or null when it didn't.
 *
 * @param error - what the read threw, or null
 * @returns the reason; unreachable for anything that isn't an AuditLogError
 */
function failureOf(error: unknown): AuditLogFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof AuditLogError ? error.failure : 'unreachable';
}

/**
 * Follows one account's staff history.
 *
 * @param userId - the account
 * @returns the page of rows, the page number, whether a next page may exist, paging and the failure
 */
export function useAccountStaffHistory(userId: string) {
  const [pageNumber, setPageNumber] = useState(1);
  const page = useQuery({
    queryKey: ['staff-account', userId, 'history', pageNumber],
    retry: false,
    queryFn: async () =>
      searchAuditLog(
        await requireStaffClient(),
        { ...emptyFilters, targetUserId: userId },
        pageNumber,
        accountHistoryPageSize,
      ),
  });
  const rows = page.data ?? [];
  return {
    rows,
    pageNumber,
    hasNextPage: rows.length === accountHistoryPageSize,
    isLoading: page.isPending,
    failure: failureOf(page.error),
    showPage: setPageNumber,
  };
}
