/**
 * useMarkets: the markets list for the website editors' picker (story S1-E11-06 criterion 2).
 *
 * Who calls it: MarketLanguagePicker and WebsiteAdminPage. What it calls: fetchMarkets from the
 * settings feature (S1-E11-05), which reads the public markets table.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { fetchMarkets, type MarketRow } from '@/features/settings/api/marketsAdmin';

/**
 * Follows the markets list.
 *
 * @returns the markets, empty while loading
 */
export function useMarkets(): MarketRow[] {
  const markets = useQuery({
    queryKey: ['website-markets'],
    queryFn: async () => fetchMarkets(await requireClient()),
  });
  return markets.data ?? [];
}
