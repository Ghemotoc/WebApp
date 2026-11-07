/**
 * useStaffDashboard: the admin front page's numbers at a glance (bundle DASH-1).
 *
 * Who calls it: components/StaffDashboardTiles.tsx. What it calls: api/staffDashboard.ts. The
 * numbers are counted live; one read a minute (and again when staff come back to the tab) keeps
 * them fresh enough without asking the database on every page.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchStaffDashboard, type DashboardTile } from '../api/staffDashboard';

/**
 * Loads the numbers.
 *
 * @returns the tiles (null while loading or after a failure) and whether the read failed
 */
export function useStaffDashboard(): { tiles: DashboardTile[] | null; loadFailed: boolean } {
  // Cached per person, so a second staff account on the same device never sees the first's numbers.
  const { userId } = useSession();
  const query = useQuery<DashboardTile[]>({
    queryKey: ['staff-dashboard', userId],
    enabled: userId !== null,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => fetchStaffDashboard(await requireClient()),
  });
  return { tiles: query.data ?? null, loadFailed: query.isError };
}
