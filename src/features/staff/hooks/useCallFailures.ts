/**
 * useCallFailures: the Failures view of Staff › Logs, failed calls of the last 7 days grouped by
 * what failed and how (bundle LOGS-1, part d).
 *
 * Who calls it: components/logs/FailuresView.tsx.
 * What it calls: api/appLogs.ts → admin_call_failures().
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { AppLogsError, fetchCallFailures } from '../api/appLogs';

import { appLogsFailureOf } from './useCallLog';

/**
 * Follows the grouped failures.
 *
 * @returns the groups and the read's state
 */
export function useCallFailures() {
  const groups = useQuery({
    queryKey: ['staff-call-failures'],
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new AppLogsError('unreachable');
      return fetchCallFailures(client);
    },
  });
  return {
    groups: groups.data ?? [],
    isLoading: groups.isLoading,
    loadFailure: appLogsFailureOf(groups.error),
  };
}
