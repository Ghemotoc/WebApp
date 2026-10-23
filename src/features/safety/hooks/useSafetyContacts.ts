/**
 * useSafetyContacts: the contacts of one country, and the gap note when there are none
 * (story S1-E10-13a).
 *
 * Who calls it: SafetyContactsBlock. What it calls: api/safetyContacts.ts. The answer is cached
 * per country for an hour: the contacts change only by migration until S1-E10-13b.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchSafetyContacts,
  noteSafetyContactGap,
  type SafetyContact,
} from '../api/safetyContacts';

/**
 * Follows the contacts of a country.
 *
 * @param countryCode - the country, or null while unknown
 * @returns the contacts, whether they are still loading, whether the country has none, and
 *   whether the read failed
 */
export function useSafetyContacts(countryCode: string | null) {
  const contacts = useQuery<SafetyContact[]>({
    queryKey: ['safety-contacts', countryCode],
    enabled: countryCode !== null,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || countryCode === null) return [];
      return fetchSafetyContacts(client, countryCode);
    },
  });
  const hasNone = contacts.isSuccess && contacts.data.length === 0;

  // A country with no row is noted for staff, once per read (the story: "the gap is logged").
  useEffect(() => {
    if (!hasNone || countryCode === null) return;
    void getSupabaseClient().then((client) => {
      if (client !== null) return noteSafetyContactGap(client, countryCode);
      return undefined;
    });
  }, [hasNone, countryCode]);

  return {
    contacts: contacts.data ?? [],
    isLoading: countryCode !== null && contacts.isPending,
    hasNone,
    loadFailed: contacts.isError,
  };
}
