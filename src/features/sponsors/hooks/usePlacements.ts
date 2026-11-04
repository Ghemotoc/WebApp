/**
 * usePlacements: what Staff › Sponsors › Placements reads and changes (story S1-E12-05; bundle
 * SPONSORS-e2).
 *
 * Who calls it: PlacementsSection and its forms. What it calls: api/placements.ts. Its reads sit
 * under the same key as the rest of Sponsors, so ending a campaign also refreshes the grid, and
 * after every change here everything is read again, so the grid shows the server's answer.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { BookingFields, HouseAdFields } from '@/schemas/adPlacements';

import {
  archiveHouseAd,
  bookSlot,
  cancelBooking,
  fetchHouseAds,
  fetchPlacements,
  saveHouseAd,
} from '../api/placements';

import { sponsorFailureOf, sponsorsQueryKey } from './useSponsorsAdmin';

/**
 * The inventory and our house ads.
 *
 * @returns the two queries
 */
export function usePlacementsData() {
  const placements = useQuery({
    queryKey: [...sponsorsQueryKey, 'placements'],
    queryFn: async () => fetchPlacements(await requireClient()),
  });
  const houseAds = useQuery({
    queryKey: [...sponsorsQueryKey, 'house-ads'],
    queryFn: async () => fetchHouseAds(await requireClient()),
  });
  return { placements, houseAds };
}

/** Every change Placements can make, one at a time. */
export type PlacementChange =
  | { kind: 'book'; campaignId: string; fields: BookingFields }
  | { kind: 'cancel'; bookingId: string; reason: string }
  | { kind: 'save_house'; houseAdId: string | null; fields: HouseAdFields }
  | { kind: 'archive_house'; houseAdId: string };

/**
 * Runs one change against the server.
 *
 * @param change - what to do
 */
async function runChange(change: PlacementChange): Promise<void> {
  const client = await requireClient();
  switch (change.kind) {
    case 'book':
      await bookSlot(client, change.campaignId, change.fields);
      return;
    case 'cancel':
      await cancelBooking(client, change.bookingId, change.reason);
      return;
    case 'save_house':
      await saveHouseAd(client, change.houseAdId, change.fields);
      return;
    case 'archive_house':
      await archiveHouseAd(client, change.houseAdId);
      return;
  }
}

/**
 * The changes of Placements. Each form keeps its own, so each shows its own outcome.
 *
 * @returns change(), the last change, its failure, whether it worked and whether one is running
 */
export function usePlacementChanges() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: runChange,
    // Whatever happened, read everything again.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sponsorsQueryKey }),
  });
  return {
    change: mutation.mutateAsync,
    lastChange: mutation.variables ?? null,
    isDone: mutation.isSuccess,
    failure: sponsorFailureOf(mutation.error),
    isRunning: mutation.isPending,
    reset: mutation.reset,
  };
}
