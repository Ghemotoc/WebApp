/**
 * useSaveBio: saves the signed-in person's bio from Settings (story S1-E5-05).
 *
 * Who calls it: BioSettingsSection. What it calls: api/writerProfile.ts → set_my_bio().
 * Afterwards every cached profile is refreshed, so the person's own profile shows the new bio.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { BioError, saveMyBio, type BioFailure } from '../api/writerProfile';

import { writerProfileQueryKey } from './useWriterProfile';

/**
 * The reason the last save failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a BioError
 */
function failureOf(hasFailed: boolean, error: unknown): BioFailure | null {
  if (!hasFailed) return null;
  return error instanceof BioError ? error.failure : 'unreachable';
}

/**
 * Saves the bio.
 *
 * @returns save(bio) (resolves to true when saved), isSaving, isSaved and failure
 */
export function useSaveBio() {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (bio: string) => saveMyBio(await requireClient(), bio),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [writerProfileQueryKey] }),
  });
  return {
    save: async (bio: string) => {
      const saved = await save.mutateAsync(bio).catch(() => null);
      return saved !== null;
    },
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    failure: failureOf(save.isError, save.error),
    reset: () => save.reset(),
  };
}
