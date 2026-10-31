/**
 * useMyOnboarding: the signed-in person's setup, and its writes (story S1-E2-06).
 *
 * Who calls it: OnboardingPage, its steps, SetupProfileNotice and the Settings "What you like"
 * section. What it calls: api/onboarding.ts → my_onboarding() and the four writes.
 * Signed out, it reads nothing. After each write the setup is read again, and finishing also
 * refreshes Discover's shelves, so "Picked for you" shows the new likes.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { storyListQueryKey } from '@/features/discovery/hooks/useStoryShelf';

import {
  fetchMyOnboarding,
  finishOnboarding,
  myOnboardingQueryKey,
  saveAdultsMayMessage,
  savePreferences,
  saveRegion,
  type MyOnboarding,
  type Preferences,
} from '../api/onboarding';

/** One write, as the hook runs it. */
type OnboardingWrite =
  | { kind: 'region'; regionCode: string | null }
  | { kind: 'preferences'; preferences: Preferences }
  | { kind: 'adultsMayMessage'; allowed: boolean }
  | { kind: 'finish' };

/**
 * Sends one write to the database.
 *
 * @throws Error when it was refused
 */
async function runWrite(write: OnboardingWrite): Promise<void> {
  const client = await requireClient();
  if (write.kind === 'region') return saveRegion(client, write.regionCode);
  if (write.kind === 'preferences') return savePreferences(client, write.preferences);
  if (write.kind === 'adultsMayMessage') return saveAdultsMayMessage(client, write.allowed);
  return finishOnboarding(client);
}

/**
 * Follows the person's setup.
 *
 * @returns onboarding (null signed out, undefined while loading), loadFailed, save(write),
 *   isSaving, saveFailed, the kind of the last write that worked and refresh()
 */
export function useMyOnboarding() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const onboarding = useQuery<MyOnboarding | null>({
    queryKey: myOnboardingQueryKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyOnboarding(await requireClient()),
  });
  const writing = useMutation({
    mutationFn: runWrite,
    onSuccess: async (_result, write) => {
      await queryClient.invalidateQueries({ queryKey: myOnboardingQueryKey(userId) });
      // New likes change "Picked for you" (browse_stories('picked')).
      if (write.kind === 'preferences')
        await queryClient.invalidateQueries({ queryKey: [storyListQueryKey] });
    },
  });
  return {
    onboarding: userId === null ? null : onboarding.data,
    loadFailed: onboarding.isError,
    save: (write: OnboardingWrite) => writing.mutateAsync(write),
    isSaving: writing.isPending,
    saveFailed: writing.isError,
    savedKind: writing.isSuccess ? writing.variables.kind : null,
    // After the username is saved elsewhere (SetupForm), so has_handle is read again.
    refresh: () => queryClient.invalidateQueries({ queryKey: myOnboardingQueryKey(userId) }),
  };
}
