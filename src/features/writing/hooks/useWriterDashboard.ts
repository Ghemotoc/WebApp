/**
 * useWriterDashboard: the signed-in writer's dashboard numbers (story S1-E3-07).
 *
 * Who calls it: YourWritingPage (/write). What it calls: api/dashboard.ts → writer_dashboard().
 * Signed out, it never asks the database. Changing the period keeps the last numbers on screen
 * until the new ones arrive, so the tiles don't jump.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchWriterDashboard, type DashboardPeriod, type WriterDashboard } from '../api/dashboard';

/**
 * Follows the dashboard for a period.
 *
 * @param period - the tiles' period
 * @returns dashboard (null while loading or signed out) and loadFailed
 */
export function useWriterDashboard(period: DashboardPeriod) {
  const { userId } = useSession();
  const dashboard = useQuery<WriterDashboard>({
    queryKey: ['writer-dashboard', userId, period],
    enabled: userId !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => fetchWriterDashboard(await requireClient(), period),
  });
  return { dashboard: dashboard.data ?? null, loadFailed: dashboard.isError };
}
