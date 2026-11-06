/**
 * useVisitorCountry: which country's contacts to show (story S1-E10-13a).
 *
 * Signed in: the account's country, the one the person says they live in (MARKETS-1; from the
 * connection before then; profiles.country_code). Signed out, or an account with no country recorded:
 * the country of this connection, from the same Pages Function sign-up uses (/api/signup-context). Unknown (Tor, a VPN, a non-country):
 * null, and the block shows the fallback with "Not your country?".
 * Who calls it: SafetyContactsBlock. What it calls: the person's own profile row and
 * src/features/auth/api/signupContext.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { fetchSignupCountry } from '@/features/auth/api/signupContext';
import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Reads the signed-in person's country from their own profile.
 *
 * @param userId - the signed-in person
 * @returns the country code, or null when the profile has none
 */
async function fetchAccountCountry(userId: string): Promise<string | null> {
  const client = await getSupabaseClient();
  if (client === null) return null;
  const { data } = await client
    .from('profiles')
    .select('country_code')
    .eq('id', userId)
    .maybeSingle();
  return data?.country_code ?? null;
}

/**
 * Follows the visitor's country.
 *
 * @returns the country code (upper case) or null, and whether the answer has arrived
 */
export function useVisitorCountry() {
  const { userId, isKnown } = useSession();
  const country = useQuery<string | null>({
    queryKey: ['visitor-country', userId],
    enabled: isKnown,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      // Step 1: a signed-in person's account country, recorded at sign-up.
      if (userId !== null) {
        const accountCountry = await fetchAccountCountry(userId);
        if (accountCountry !== null) return accountCountry;
      }
      // Step 2: otherwise (signed out, or an account made before the country was recorded) the
      // country of this connection.
      return (await fetchSignupCountry()).country;
    },
  });
  return {
    countryCode: country.data?.toUpperCase() ?? null,
    isKnown: isKnown && !country.isPending,
  };
}
