/**
 * The hooks behind Settings › Privacy (story S1-E13-01).
 *
 * Who calls them: PrivacySettingsSection, LibraryVisibilityLine, PresenceHeartbeat and
 * HowLongWeKeep (IDEAS-2a).
 * What they call: api/privacy.ts. After a save, the settings, every profile and every story list
 * are read again, so the profile page and the library shelf agree with the new choice at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { risingWritersQueryKey } from '@/features/discovery/hooks/useRisingWriters';
import { storyListQueryKey } from '@/features/discovery/hooks/useStoryShelf';
import { writerProfileQueryKey } from '@/features/people/hooks/useWriterProfile';

import {
  fetchPrivacySettings,
  fetchRetentionPeriods,
  saveLibraryAudience,
  saveProfileAudience,
  saveShowsOnlineStatus,
  saveSuggestMe,
  type LibraryAudience,
  type ProfileAudience,
} from '../api/privacy';

/** The settings' cache key, per person, so a new sign-in never shows the last person's. */
export function privacySettingsKey(userId: string | null) {
  return ['privacy-settings', userId] as const;
}

/**
 * The caller's privacy settings; waits while signed out.
 *
 * @returns TanStack Query's result
 */
export function usePrivacySettings() {
  const { userId } = useSession();
  return useQuery({
    queryKey: privacySettingsKey(userId),
    enabled: userId !== null,
    retry: false,
    queryFn: async () => fetchPrivacySettings(await requireClient()),
  });
}

/**
 * Saving the privacy choices.
 *
 * @returns saveProfile(audience), saveLibrary(audience), saveOnline(shouldShow),
 *   saveSuggest(shouldSuggest), isSaving and hasFailed
 */
export function useSavePrivacySettings() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  /** After a save: the settings, the profiles and the story lists are read again. */
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: privacySettingsKey(userId) });
    await queryClient.invalidateQueries({ queryKey: [writerProfileQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [storyListQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [risingWritersQueryKey] });
  };
  const profile = useMutation({
    mutationFn: async (audience: ProfileAudience) =>
      saveProfileAudience(await requireClient(), audience),
    onSuccess: refresh,
  });
  const library = useMutation({
    mutationFn: async (audience: LibraryAudience) =>
      saveLibraryAudience(await requireClient(), audience),
    onSuccess: refresh,
  });
  const online = useMutation({
    mutationFn: async (shouldShow: boolean) =>
      saveShowsOnlineStatus(await requireClient(), shouldShow),
    onSuccess: refresh,
  });
  const suggest = useMutation({
    mutationFn: async (shouldSuggest: boolean) =>
      saveSuggestMe(await requireClient(), shouldSuggest),
    onSuccess: refresh,
  });
  return {
    saveSuggest: (shouldSuggest: boolean) => suggest.mutateAsync(shouldSuggest),
    saveProfile: (audience: ProfileAudience) => profile.mutateAsync(audience),
    saveLibrary: (audience: LibraryAudience) => library.mutateAsync(audience),
    saveOnline: (shouldShow: boolean) => online.mutateAsync(shouldShow),
    isSaving: profile.isPending || library.isPending || online.isPending || suggest.isPending,
    hasFailed: profile.isError || library.isError || online.isError || suggest.isError,
  };
}

/**
 * How long each kind of the caller's data is kept (IDEAS-2a), read when "How long we keep things"
 * is first opened; reading it again each time keeps it in step with a staff change.
 *
 * @param isOpen - true once the list is opened; nothing is read before that
 * @returns TanStack Query's result
 */
export function useRetentionPeriods(isOpen: boolean) {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['retention-periods', userId],
    enabled: userId !== null && isOpen,
    retry: false,
    staleTime: 0,
    queryFn: async () => fetchRetentionPeriods(await requireClient()),
  });
}
