/**
 * useInvestorNumbers: the staff Metrics page's investor numbers (story S1-E15-04).
 *
 * Who calls it: components/metrics/InvestorNumbersSection.tsx. What it calls: api/investorNumbers.ts.
 * The numbers change once a night, so one read per visit is enough.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchInvestorNumbers, type InvestorNumbers } from '../api/investorNumbers';
import { MarchNumbersError, type MarchNumbersFailure } from '../api/marchNumbers';

/**
 * Loads the numbers.
 *
 * @returns the numbers (null while loading or after a failure) and why it failed, if it did
 */
export function useInvestorNumbers(): {
  numbers: InvestorNumbers | null;
  failure: MarchNumbersFailure | null;
} {
  const query = useQuery<InvestorNumbers>({
    queryKey: ['investor-numbers'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new MarchNumbersError('unreachable');
      return fetchInvestorNumbers(client);
    },
  });
  let failure: MarchNumbersFailure | null = null;
  if (query.isError) {
    failure = query.error instanceof MarchNumbersError ? query.error.failure : 'unreachable';
  }
  return { numbers: query.data ?? null, failure };
}
