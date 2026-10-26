/**
 * useMyReportsAndDecisions: the signed-in person's statements of reasons and the reports they
 * sent, for "My reports and decisions" (story S1-E10-04; board 6.5).
 *
 * Who calls it: MyReportsPage. What it calls: api/statements.ts → my_statements(), my_reports().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchMyReports, fetchMyStatements } from '../api/statements';

/**
 * Follows both lists.
 *
 * @param isSignedIn - false for a visitor, so nothing is asked
 * @returns the statements, the reports, whether they are loading and whether a read failed
 */
export function useMyReportsAndDecisions(isSignedIn: boolean) {
  const statements = useQuery({
    queryKey: ['my-statements'],
    enabled: isSignedIn,
    retry: false,
    queryFn: async () => fetchMyStatements(await requireClient()),
  });
  const reports = useQuery({
    queryKey: ['my-reports'],
    enabled: isSignedIn,
    retry: false,
    queryFn: async () => fetchMyReports(await requireClient()),
  });
  return {
    statements: statements.data ?? [],
    reports: reports.data ?? [],
    isLoading: statements.isPending || reports.isPending,
    loadFailed: statements.isError || reports.isError,
  };
}
