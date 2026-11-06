/**
 * useMyNames: the signed-in person's username and pen name, how long each must wait between
 * changes, and saving them (story S1-E2-04).
 *
 * Who calls it: OnboardingPage (/setup), AccountNamesSection (/settings) and SetupProfileNotice.
 * What it calls: api/accountNames.ts (profiles through profiles_select_own; the public settings;
 * set_my_handle() and set_my_pen_name()), and useSession to know whether someone is signed in.
 * Signed out, it never asks the database and the names are null.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import {
  fetchMyNames,
  fetchNameChangeDays,
  saveHandle,
  savePenName,
  type MyNames,
  type NameChangeDays,
} from '../api/accountNames';

/** The cache key of the signed-in person's names (the country setting refreshes it too). */
export const myNamesKey = (userId: string | null) => ['my-names', userId];

/**
 * Gets the shared client, or fails in plain words when the app has no database settings.
 *
 * @returns the client
 */
export async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new Error('The app is not connected to its database.');
  return client;
}

/**
 * Follows the signed-in person's names and offers ways to save them.
 *
 * @returns names (null while loading or signed out), changeDays, isSignedIn, isKnown (the session
 *   and the names have loaded), loadFailed, and the two save mutations
 */
export function useMyNames() {
  const { userId, isKnown: isSessionKnown } = useSession();
  const queryClient = useQueryClient();

  // Step 1: the names, only when someone is signed in; each person has their own cache entry.
  const names = useQuery<MyNames | null>({
    queryKey: myNamesKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyNames(await requireClient()),
  });

  // Step 2: the waiting days are the same for everyone, so they share one cache entry.
  const changeDays = useQuery<NameChangeDays>({
    queryKey: ['name-change-days'],
    enabled: userId !== null,
    queryFn: async () => fetchNameChangeDays(await requireClient()),
  });

  // Step 3: saving either name reads the names again, so every screen shows the new ones.
  const refresh = () => queryClient.invalidateQueries({ queryKey: myNamesKey(userId) });
  const handleSave = useMutation({
    mutationFn: async (newHandle: string) => saveHandle(await requireClient(), newHandle),
    onSuccess: refresh,
  });
  const penNameSave = useMutation({
    mutationFn: async (newPenName: string) => savePenName(await requireClient(), newPenName),
    onSuccess: refresh,
  });

  return {
    names: names.data ?? null,
    changeDays: changeDays.data ?? { handle: 30, penName: 30 },
    isSignedIn: userId !== null,
    isKnown: isSessionKnown && (userId === null || !names.isPending),
    loadFailed: names.isError,
    handleSave,
    penNameSave,
  };
}
