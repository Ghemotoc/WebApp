/**
 * A space's welcome note as React hooks (bundle 14d IDEAS-3, part d; idea IDEA-20261102-6).
 *
 * Who calls it: SpaceWelcomeNoteCard (Space settings) and SpaceWelcomeNote (the space page).
 * What it calls: ../api/spaceWelcome.ts. Both refresh the space afterwards, so the page shows the
 * new note, or stops showing it after "Got it".
 */
import { useMutation } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { dismissWelcomeNote, saveWelcomeNote } from '../api/spaceWelcome';

import { spaceFailureOf, useRefreshSpaces } from './useSpaces';

/**
 * Saves the welcome note.
 *
 * @param slug - the space's address
 * @returns run(note), the failure and isRunning
 */
export function useSaveWelcomeNote(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (note: string) => saveWelcomeNote(await requireClient(), slug, note),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * "Got it" on the welcome note.
 *
 * @param slug - the space's address
 * @returns run(), the failure and isRunning
 */
export function useDismissWelcomeNote(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async () => dismissWelcomeNote(await requireClient(), slug),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
