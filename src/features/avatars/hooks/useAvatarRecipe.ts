/**
 * useAvatarRecipe and useSaveAvatarRecipe: a profile's drawn avatar, and saving one's own
 * (bundle ADMIN-2, part g).
 *
 * Who calls it: AvatarImage (every round avatar) and AvatarBuilderSection (Settings).
 * What it calls: api/avatarRecipe.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import {
  AvatarSaveError,
  fetchAvatarRecipe,
  saveMyAvatarRecipe,
  type AvatarSaveFailure,
} from '../api/avatarRecipe';

/** An avatar rarely changes: read it again at most every 10 minutes. */
const freshForMilliseconds = 10 * 60 * 1000;

/** The query key of one profile's avatar. */
function keyOf(handle: string) {
  return ['avatar-recipe', handle];
}

/**
 * Follows a profile's recipe.
 *
 * @param handle - the username, without "@" ('' while it isn't known)
 * @returns the query: data is the recipe or null
 */
export function useAvatarRecipe(handle: string) {
  return useQuery({
    queryKey: keyOf(handle),
    enabled: handle !== '',
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchAvatarRecipe(await requireClient(), handle),
  });
}

/**
 * Saves the signed-in person's recipe and updates every avatar of theirs on screen.
 *
 * @param handle - the signed-in person's username
 * @returns save(), its state and the failure, if any
 */
export function useSaveAvatarRecipe(handle: string) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (recipe: AvatarRecipe | null) =>
      saveMyAvatarRecipe(await requireClient(), recipe),
    // The saved recipe is what the database kept, so it goes straight into the cache.
    onSuccess: (_nothing, recipe) => queryClient.setQueryData(keyOf(handle), recipe),
  });
  // The plain-words reason for a refusal; any other error means the server couldn't be reached.
  let failure: AvatarSaveFailure | null = null;
  if (save.isError) {
    failure = save.error instanceof AvatarSaveError ? save.error.failure : 'unreachable';
  }
  return {
    save: (recipe: AvatarRecipe | null) => save.mutateAsync(recipe),
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    failure,
  };
}
