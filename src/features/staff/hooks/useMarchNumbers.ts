/**
 * useMarchNumbers: the staff Metrics page's numbers (story S1-E15-02).
 *
 * Who calls it: components/metrics/MarchNumbersPage.tsx. What it calls: api/marchNumbers.ts.
 * The numbers change once a night, so one read per visit is enough.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchMarchNumbers,
  MarchNumbersError,
  type MarchNumbers,
  type MarchNumbersFailure,
} from '../api/marchNumbers';

/**
 * Loads the numbers.
 *
 * @returns the numbers (null while loading or after a failure) and why it failed, if it did
 */
export function useMarchNumbers(): {
  numbers: MarchNumbers | null;
  failure: MarchNumbersFailure | null;
} {
  const query = useQuery<MarchNumbers>({
    queryKey: ['march-numbers'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      // No database settings means nothing can be read.
      const client = await getSupabaseClient();
      if (client === null) throw new MarchNumbersError('unreachable');
      return fetchMarchNumbers(client);
    },
  });
  // A refusal is its own failure; anything else counts as "couldn't reach the database".
  let failure: MarchNumbersFailure | null = null;
  if (query.isError) {
    failure = query.error instanceof MarchNumbersError ? query.error.failure : 'unreachable';
  }
  return { numbers: query.data ?? null, failure };
}
