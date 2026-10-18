/**
 * useSignUpMarket: the visitor's country, whether sign-up is open there, its minimum age and the
 * signed token the sign-up sends (story S1-E2-10).
 *
 * Who calls it: SignUpPage. What it calls: api/signupContext.ts.
 * Rules (decided 17 Oct 2026, 19:43, Q6): while invite_only and adults_only are both on (the March
 * test), every country is open to an invited adult, unknown included. Once sign-up is public, a
 * closed or unknown country leads to the "not open in your country yet" page. The token is asked
 * for again every 4 minutes, because the database accepts it for 10.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchMarkets,
  fetchSignupCountry,
  type Market,
  type SignupCountry,
} from '../api/signupContext';

/** How often to ask for a fresh token, in milliseconds (it lasts 10 minutes). */
const tokenRefresh = 4 * 60_000;

/** What the sign-up page needs to know. */
export interface SignUpMarket {
  country: string | null;
  token: string | null;
  /** The market's minimum age (13 unless the market says otherwise, for example 16 in Australia). */
  minimumAge: number;
  /** True once it is known that sign-up isn't open from here. */
  isClosed: boolean;
}

/**
 * Finds the market of the visitor.
 *
 * @param markets - every market
 * @param country - the visitor's country, or null
 * @returns the market, or undefined when unknown or not listed
 */
function marketOf(markets: Market[], country: string | null): Market | undefined {
  return markets.find((market) => market.countryCode === country);
}

/**
 * Follows the visitor's market.
 *
 * @param isInvitedTest - invite_only and adults_only are both on
 * @returns the country, token, minimum age and whether sign-up is closed from here
 */
export function useSignUpMarket(isInvitedTest: boolean): SignUpMarket {
  const signupCountry = useQuery<SignupCountry>({
    queryKey: ['signup-country'],
    staleTime: tokenRefresh,
    refetchInterval: tokenRefresh,
    queryFn: fetchSignupCountry,
  });
  const markets = useQuery<Market[]>({
    queryKey: ['markets'],
    staleTime: Infinity,
    queryFn: async () => {
      const client = await getSupabaseClient();
      return client === null ? [] : fetchMarkets(client);
    },
  });

  // Step 1: the visitor's market, once both answers are in.
  const answer = signupCountry.data ?? { country: null, token: null };
  const market = marketOf(markets.data ?? [], answer.country);
  const isLoaded = signupCountry.isSuccess && markets.isSuccess;
  // Step 2: closed only once sign-up is public and the market is unknown or closed.
  const isOpenHere = market?.isOpen === true;
  return {
    country: answer.country,
    token: answer.token,
    minimumAge: market === undefined ? 13 : market.minimumAge,
    isClosed: !isInvitedTest && isLoaded && !isOpenHere,
  };
}
