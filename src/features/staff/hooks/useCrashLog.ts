/**
 * useCrashLog: the Crashes view of Staff › Logs, errors the browser hit that nothing caught
 * (bundle LOGS-1, part d; the log itself is S1-E1-05's, which had no screen until now).
 *
 * Who calls it: components/logs/CrashesView.tsx.
 * What it calls: api/appLogs.ts → admin_list_client_errors().
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { AppLogsError, fetchCrashes } from '../api/appLogs';

import { appLogsFailureOf } from './useCallLog';

/**
 * Follows the crash log.
 *
 * @returns the crashes and the read's state
 */
export function useCrashLog() {
  const crashes = useQuery({
    queryKey: ['staff-crash-log'],
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new AppLogsError('unreachable');
      return fetchCrashes(client);
    },
  });
  return {
    crashes: crashes.data ?? [],
    isLoading: crashes.isLoading,
    loadFailure: appLogsFailureOf(crashes.error),
  };
}
