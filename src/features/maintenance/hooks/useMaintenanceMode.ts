/**
 * useMaintenanceMode: whether this person should see the maintenance page (story S1-E1-05).
 *
 * Who calls it: components/MaintenanceGate.tsx.
 * What it calls: api/maintenance.ts, through TanStack Query.
 * - The flag is read again every minute and when the tab comes back into view, so switching it
 *   in the SQL editor reaches open pages within about a minute (architecture 1.8.4: "every change
 *   applies within a minute"). "Check again" reads it at once.
 * - Staff are asked about only while maintenance is on and someone is signed in.
 * Safe default: if the flag can't be read, the app stays open. A database that can't be reached
 * shows its own errors, and maintenance mode is a notice, not the lock (the database is).
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchIsStaffSession, fetchMaintenanceMode } from '../api/maintenance';

/** How often an open page reads the flag again. */
const flagRefreshMilliseconds = 60_000;

/** What the hook answers. */
export interface MaintenanceState {
  /** True when this person should see the maintenance page. */
  isClosedForThisPerson: boolean;
  /** Reads the flag again now ("Check again"). */
  checkAgain: () => void;
  /** True while that read is running. */
  isChecking: boolean;
}

/**
 * Says whether maintenance mode applies to this person.
 *
 * @returns the state above
 */
export function useMaintenanceMode(): MaintenanceState {
  const { userId } = useSession();

  // Step 1: the flag itself.
  const maintenance = useQuery({
    queryKey: ['maintenance-mode'],
    refetchInterval: flagRefreshMilliseconds,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) return false;
      return fetchMaintenanceMode(client);
    },
  });
  const isMaintenanceOn = maintenance.data === true;

  // Step 2: only when it is on and someone is signed in, ask whether they are staff.
  const staffSession = useQuery({
    queryKey: ['is-staff-session', userId],
    enabled: isMaintenanceOn && userId !== null,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) return false;
      return fetchIsStaffSession(client);
    },
  });

  return {
    // Until the staff answer arrives, a signed-in person sees the maintenance page too.
    isClosedForThisPerson: isMaintenanceOn && staffSession.data !== true,
    checkAgain: () => void maintenance.refetch(),
    isChecking: maintenance.isFetching,
  };
}
