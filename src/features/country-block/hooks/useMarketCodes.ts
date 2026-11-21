/**
 * useMarketCodes: every market's country code, for the "Add a country" drop-down (bundle COUNTRY-1).
 *
 * Who calls it: components/HiddenCountriesPicker.tsx. What it calls: fetchMarkets() from the auth
 * feature, which reads the public markets table (S1-E2-10).
 * Why the markets: board D07 offers the countries the platform serves; the database accepts any
 * two-letter code, so the list can grow with the markets without a change here.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { fetchMarkets } from '@/features/auth/api/signupContext';

/**
 * Follows the markets' codes.
 *
 * @returns the codes, empty while loading or when the read fails (the chosen countries still show)
 */
export function useMarketCodes(): string[] {
  const markets = useQuery({
    queryKey: ['country-block-markets'],
    queryFn: async () => fetchMarkets(await requireClient()),
    staleTime: 60 * 60 * 1000,
  });
  return (markets.data ?? []).map((market) => market.countryCode);
}
