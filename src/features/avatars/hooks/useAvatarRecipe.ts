/**
 * useAvatarLook, useAvatarRecipe, useSaveAvatarRecipe and useSaveInitialsColour: a profile's look
 * (its drawn avatar and initials colour), and saving one's own (bundle ADMIN-2, part g; the
 * initials colour from bundle G11a). One read per profile serves both halves: every hook here
 * shares the same cached look.
 *
 * Who calls it: PersonAvatar, ProfileAvatar and AvatarImage (every round avatar),
 * AvatarBuilderSection and InitialsColourSection (Settings). What it calls: api/avatarRecipe.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import {
  AvatarSaveError,
  fetchAvatarLook,
  plainAvatarLook,
  saveMyAvatarRecipe,
  saveMyInitialsColour,
  type AvatarLook,
  type AvatarSaveFailure,
} from '../api/avatarRecipe';
import type { BeadColourName } from '../lib/beadColours';

/** An avatar rarely changes: read it again at most every 10 minutes. */
const freshForMilliseconds = 10 * 60 * 1000;

/** The query key of one profile's look. */
function keyOf(handle: string) {
  return ['avatar-look', handle];
}

/** The settings every read of a look shares. */
function lookQuery(handle: string) {
  return {
    queryKey: keyOf(handle),
    enabled: handle !== '',
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchAvatarLook(await requireClient(), handle),
  };
}

/**
 * Follows a profile's look.
 *
 * @param handle - the username, without "@" ('' while it isn't known, or for a deleted account)
 * @returns the query: data is the look
 */
export function useAvatarLook(handle: string) {
  return useQuery(lookQuery(handle));
}

/**
 * Follows a profile's drawn avatar.
 *
 * @param handle - the username, without "@" ('' while it isn't known)
 * @returns the query: data is the recipe or null
 */
export function useAvatarRecipe(handle: string) {
  return useQuery({ ...lookQuery(handle), select: (look: AvatarLook) => look.recipe });
}

/**
 * The plain-words reason a save failed, or null.
 *
 * @param save - the mutation's state
 * @returns the failure; any error other than a refusal means the server couldn't be reached
 */
function failureOf(save: { isError: boolean; error: unknown }): AvatarSaveFailure | null {
  if (!save.isError) return null;
  return save.error instanceof AvatarSaveError ? save.error.failure : 'unreachable';
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
    onSuccess: (_nothing, recipe) =>
      queryClient.setQueryData<AvatarLook>(keyOf(handle), (look) => ({
        ...(look ?? plainAvatarLook),
        recipe,
      })),
  });
  return {
    save: (recipe: AvatarRecipe | null) => save.mutateAsync(recipe),
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    failure: failureOf(save),
  };
}

/**
 * Saves the colour of the signed-in person's initials and updates every bead of theirs on screen.
 *
 * @param handle - the signed-in person's username
 * @returns save(), its state and the failure, if any
 */
export function useSaveInitialsColour(handle: string) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (colour: BeadColourName | null) =>
      saveMyInitialsColour(await requireClient(), colour),
    // The saved colour is what the database kept, so it goes straight into the cache.
    onSuccess: (_nothing, initialsColour) =>
      queryClient.setQueryData<AvatarLook>(keyOf(handle), (look) => ({
        ...(look ?? plainAvatarLook),
        initialsColour,
      })),
  });
  return {
    save: (colour: BeadColourName | null) => save.mutateAsync(colour),
    /** Forgets the last save's outcome, once the person picks another colour. */
    reset: save.reset,
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    failure: failureOf(save),
  };
}
