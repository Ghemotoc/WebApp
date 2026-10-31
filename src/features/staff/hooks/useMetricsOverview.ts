/**
 * useMetricsOverview: the Metrics page's sign-ups by age group, age checks and cases by tier
 * (story S1-E11-04).
 *
 * Who calls it: components/metrics/MetricsOverviewSections.tsx. What it calls:
 * api/metricsOverview.ts. The numbers are counted live, but nobody needs them to the second, so
 * one read every five minutes is enough.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchMetricsOverview,
  MetricsOverviewError,
  type MetricsOverview,
  type MetricsOverviewFailure,
} from '../api/metricsOverview';

/**
 * Loads the numbers.
 *
 * @returns the numbers (null while loading or after a failure) and why it failed, if it did
 */
export function useMetricsOverview(): {
  overview: MetricsOverview | null;
  failure: MetricsOverviewFailure | null;
} {
  const query = useQuery<MetricsOverview>({
    queryKey: ['metrics-overview'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => fetchMetricsOverview(await requireClient()),
  });
  // A refusal is its own failure; anything else counts as "couldn't reach the database".
  let failure: MetricsOverviewFailure | null = null;
  if (query.isError) {
    failure = query.error instanceof MetricsOverviewError ? query.error.failure : 'unreachable';
  }
  return { overview: query.data ?? null, failure };
}
