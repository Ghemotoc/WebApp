/**
 * useLegalVersions: every live version of one legal document, cached (story S1-E14-01).
 *
 * Who calls it: LegalCentrePage (src/features/legal/components/).
 * What it calls: api/legalDocuments.ts through the shared Supabase client.
 * The answer is cached by TanStack Query, so moving between the tabs and back doesn't fetch again.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchLegalVersions, type LegalVersion } from '../api/legalDocuments';

/**
 * Loads the versions of one document.
 *
 * @param documentSlug - for example 'terms'
 * @returns TanStack Query's result: data (the versions, newest first), isPending and isError
 * Errors: when Supabase isn't configured or can't be reached the result is an error, which the
 *   page shows in plain words with a "Try again" button.
 */
export function useLegalVersions(documentSlug: string) {
  return useQuery<LegalVersion[]>({
    queryKey: ['legal-versions', documentSlug],
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchLegalVersions(client, documentSlug);
    },
  });
}
