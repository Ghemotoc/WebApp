/**
 * useCallLog: the Calls view of Staff › Logs: the typed filters, the searched filters, and paging
 * back through time (bundle LOGS-1, part d).
 *
 * Who calls it: components/logs/CallsView.tsx.
 * What it calls: api/appLogs.ts → admin_list_calls(). The page reads again only when Search is
 * pressed, never per keystroke, so filtering by a person writes one audit row per search.
 * Paging: each page asks for the calls before the last one shown, so new calls arriving don't
 * shift the pages; the stack of those times lets "Newer" go back.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import {
  AppLogsError,
  callLogPageSize,
  fetchCalls,
  type AppLogsFailure,
  type CallLogFilters,
} from '../api/appLogs';

/** No filters: every call of the last 30 days. */
export const emptyCallLogFilters: CallLogFilters = {
  onlyFailures: false,
  kind: '',
  nameContains: '',
  personHandle: '',
};

/**
 * The reason a read failed, or null when it didn't.
 *
 * @param error - what the read threw, or null
 * @returns the reason; unreachable for anything that isn't an AppLogsError
 */
export function appLogsFailureOf(error: unknown): AppLogsFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof AppLogsError ? error.failure : 'unreachable';
}

/**
 * Follows the Calls view.
 *
 * @returns the filters, the page's calls, paging and the read's state
 */
export function useCallLog() {
  const [typedFilters, setTypedFilters] = useState<CallLogFilters>(emptyCallLogFilters);
  const [searchedFilters, setSearchedFilters] = useState<CallLogFilters>(emptyCallLogFilters);
  // The "before" time of each page shown so far; the last one is the page on screen.
  const [pageStarts, setPageStarts] = useState<(string | null)[]>([null]);
  const before = pageStarts.at(-1) ?? null;

  // Step 1: the page on screen.
  const page = useQuery({
    queryKey: ['staff-call-log', searchedFilters, before],
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new AppLogsError('unreachable');
      return fetchCalls(client, searchedFilters, before);
    },
  });
  const rows = page.data ?? [];
  const calls = rows.slice(0, callLogPageSize);

  // Step 2: the actions.
  function search() {
    setSearchedFilters(typedFilters);
    setPageStarts([null]);
  }
  function goOlder() {
    const last = calls.at(-1);
    if (last !== undefined) setPageStarts([...pageStarts, last.calledAt]);
  }
  function goNewer() {
    if (pageStarts.length > 1) setPageStarts(pageStarts.slice(0, -1));
  }

  return {
    typedFilters,
    setTypedFilters,
    search,
    calls,
    isLoading: page.isLoading,
    loadFailure: appLogsFailureOf(page.error),
    pageNumber: pageStarts.length,
    hasOlderPage: rows.length > callLogPageSize,
    goOlder,
    goNewer,
  };
}
