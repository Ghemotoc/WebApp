/**
 * useRememberedPlace: where a person was, kept so they come back to the same place (design books
 * item 17, "Don't start from zero"; Saffer's rule, and Tidwell's "Changes in Midstream").
 *
 * Signed in: the place lives in the account (remembered_places), so every device opens it; the
 * browser keeps a copy so the page can use it before the account answers. Signed out: the place
 * lives in this browser only.
 * Who calls it: the reader's language switch, the Story Atlas and the chapter editor (and the
 * Atlas hints, item 18). What it calls: localPlaces.ts and rememberedPlaces.ts.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import type { Json } from '@/lib/database.types';

import { readLocalPlace, writeLocalPlace, type RememberedPlaceKind } from './localPlaces';
import { fetchRememberedPlace, saveRememberedPlace } from './rememberedPlaces';

/** The query's first key; one cached copy per kind and item. */
export const rememberedPlaceQueryKey = 'remembered-place';

/** What the hook gives back. */
export interface RememberedPlace {
  /** The place, from the account when signed in (the browser's copy until it answers). */
  place: Json | null;
  /** True once the session is known and the account has answered (at once while signed out). */
  isSettled: boolean;
  /** Keeps a new place: in the browser at once, and in the account when signed in. */
  remember: (place: Json) => void;
}

/**
 * Follows one remembered place.
 *
 * @param kind - what is remembered
 * @param itemKey - the story's address or the hint's name; null while it is not known yet
 * @returns place, isSettled and remember(place)
 */
export function useRememberedPlace(
  kind: RememberedPlaceKind,
  itemKey: string | null,
): RememberedPlace {
  const { userId, isKnown } = useSession();
  const isSignedIn = isKnown && userId !== null;
  const queryClient = useQueryClient();
  const queryKey = [rememberedPlaceQueryKey, kind, itemKey, userId];
  // Step 1: the browser's copy, at once.
  const localPlace = itemKey === null ? null : readLocalPlace(kind, itemKey);
  // Step 2: the account's copy for a signed-in person; it wins once it arrives.
  const query = useQuery({
    queryKey,
    enabled: isSignedIn && itemKey !== null,
    staleTime: Infinity,
    // One try: on a failure the browser's copy is used at once, rather than a blank page waiting.
    retry: false,
    queryFn: async () => fetchRememberedPlace(await requireClient(), kind, itemKey ?? ''),
  });
  const accountPlace = query.data;
  const place = accountPlace === undefined || accountPlace === null ? localPlace : accountPlace;
  // Step 3: a new place goes to the browser and the cache at once, then to the account.
  const remember = useCallback(
    (newPlace: Json) => {
      if (itemKey === null) return;
      writeLocalPlace(kind, itemKey, newPlace);
      queryClient.setQueryData([rememberedPlaceQueryKey, kind, itemKey, userId], newPlace);
      if (!isSignedIn) return;
      void (async () => {
        try {
          await saveRememberedPlace(await requireClient(), kind, itemKey, newPlace);
        } catch (error) {
          // Not worth an alert: the browser still has it. Logged without the place itself.
          console.warn(`A ${kind} place was not kept in the account.`, error);
        }
      })();
    },
    [kind, itemKey, isSignedIn, queryClient, userId],
  );
  // Settled once the session is known and, when signed in, the account has answered (or failed).
  const isSettled = isKnown && (!isSignedIn || itemKey === null || query.isFetched);
  return { place, isSettled, remember };
}
