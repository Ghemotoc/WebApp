/**
 * useMarketsAdmin: the languages and markets for Staff › Settings, and changing their status
 * (story S1-E11-05).
 *
 * Who calls it: MarketsSection. What it calls: api/marketsAdmin.ts. After a change the story
 * form's languages are read again, so a newly opened language can be chosen at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchLanguages,
  fetchMarkets,
  saveMarket,
  setLanguageStatus,
  type MarketRow,
  type OpeningStatus,
} from '../api/marketsAdmin';

import { shownFailureOf } from './settingsFailure';

/** One change: a language's status, or a market's status and legal check. */
export type MarketChange =
  | { kind: 'language'; code: string; status: OpeningStatus }
  | { kind: 'market'; market: Pick<MarketRow, 'countryCode' | 'status' | 'legalCheck'> };

/**
 * Carries out one change.
 *
 * @param change - what to change
 */
async function applyChange(change: MarketChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'language') {
    await setLanguageStatus(client, change.code, change.status);
    return;
  }
  await saveMarket(client, change.market);
}

/**
 * Follows the languages and markets.
 *
 * @returns them, their load state, change() and the last change's state
 */
export function useMarketsAdmin() {
  const queryClient = useQueryClient();
  const languages = useQuery({
    queryKey: ['settings-admin', 'languages'],
    retry: false,
    queryFn: async () => fetchLanguages(await requireClient()),
  });
  const markets = useQuery({
    queryKey: ['settings-admin', 'markets'],
    retry: false,
    queryFn: async () => fetchMarkets(await requireClient()),
  });
  const mutation = useMutation({
    mutationFn: applyChange,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-admin'] });
      await queryClient.invalidateQueries({ queryKey: ['story-languages'] });
    },
  });
  return {
    languages: languages.data ?? [],
    markets: markets.data ?? [],
    isLoading: languages.isPending || markets.isPending,
    loadFailure:
      shownFailureOf(languages.isError, languages.error) ??
      shownFailureOf(markets.isError, markets.error),
    change: (change: MarketChange) => mutation.mutateAsync(change),
    isChanging: mutation.isPending,
    failedChange: mutation.isError ? mutation.variables : null,
    changeFailure: shownFailureOf(mutation.isError, mutation.error),
    resetFailure: () => mutation.reset(),
  };
}

/** What useMarketsAdmin returns, for the tables' props. */
export type MarketsAdminState = ReturnType<typeof useMarketsAdmin>;
