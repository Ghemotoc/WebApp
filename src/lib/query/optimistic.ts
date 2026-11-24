/**
 * optimistic: the small helper behind "the screen changes at once" (design books item 13,
 * "Small moments": Like, Follow and Add to a bookshelf answer within 100 ms and roll back with a
 * note if the server says no).
 *
 * Who calls it: the mutation hooks useChapterLike, useFollow and useStoryLibraryState, from their
 * onMutate and onError. What it calls: TanStack Query's cache (cancelQueries, getQueryData and
 * setQueryData) only; the server call itself stays in each hook's mutationFn.
 *
 * How it works: before the request leaves, showOptimistic() stops any read of the same key that
 * is in flight (so an older answer can't overwrite the new state), remembers what the cache held
 * and writes the expected state. If the request fails, rollBack() puts the remembered state back,
 * and the hook's own failure note tells the person it didn't save.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** What the cache held before the optimistic change, so a failure can put it back. */
export interface OptimisticSnapshot<Data> {
  queryKey: QueryKey;
  previous: Data | undefined;
}

/**
 * Writes the expected state into the cache straight away.
 *
 * @param queryClient - the app's query client
 * @param queryKey - the key of the query the screen reads
 * @param expected - works out the new state from the current one; return the current value
 *   unchanged when there is nothing to show yet (still loading)
 * @returns the snapshot to hand to rollBack() if the request fails
 */
export async function showOptimistic<Data>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  expected: (current: Data | undefined) => Data | undefined,
): Promise<OptimisticSnapshot<Data>> {
  // Step 1: an older read still in flight would overwrite the new state when it lands.
  await queryClient.cancelQueries({ queryKey });
  // Step 2: remember what was there, then show what the person asked for.
  const previous = queryClient.getQueryData<Data>(queryKey);
  queryClient.setQueryData<Data | undefined>(queryKey, expected(previous));
  return { queryKey, previous };
}

/**
 * Puts the cache back the way it was before showOptimistic().
 *
 * @param queryClient - the app's query client
 * @param snapshot - what showOptimistic() returned; undefined when onMutate never ran
 */
export function rollBack<Data>(
  queryClient: QueryClient,
  snapshot: OptimisticSnapshot<Data> | undefined,
): void {
  // Nothing was changed when the mutation failed before onMutate finished.
  if (snapshot === undefined) return;
  queryClient.setQueryData<Data | undefined>(snapshot.queryKey, snapshot.previous);
}
