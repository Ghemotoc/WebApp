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
import { readerLevelQueryKey } from '@/features/people/hooks/useReaderLevel';
import { writerProfileQueryKey } from '@/features/people/hooks/useWriterProfile';
import { suggestionsQueryKey } from '@/features/suggestions/hooks/useSuggestionRow';
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  fetchPrivacySettings,
  fetchRetentionPeriods,
  saveLibraryAudience,
  saveProfileAudience,
  saveChecksPersonalDetails,
  saveSuggestsFromReading,
  saveReaderLevelVisibility,
  saveShowsOnlineStatus,
  saveSuggestMe,
  type LibraryAudience,
  type ProfileAudience,
  type ReaderLevelVisibility,
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

/** One save: the database call that stores a value, given the shared client. */
type PrivacySave<Value> = (client: AppSupabaseClient, value: Value) => Promise<void>;

/**
 * One choice's save as a mutation: gets the client, saves, then reads everything again.
 *
 * @param save - the api/privacy.ts function that stores the value
 * @param refresh - what to read again after a save
 * @returns TanStack Query's mutation
 */
function usePrivacySave<Value>(save: PrivacySave<Value>, refresh: () => Promise<void>) {
  return useMutation({
    mutationFn: async (value: Value) => save(await requireClient(), value),
    onSuccess: refresh,
  });
}

/**
 * After a save: the settings, the profiles, the story lists and the suggestion rows are read
 * again, so every screen shows the new choice.
 *
 * @returns the refresh function
 */
function usePrivacyRefresh() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: privacySettingsKey(userId) });
    await queryClient.invalidateQueries({ queryKey: [writerProfileQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [storyListQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [risingWritersQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [readerLevelQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [suggestionsQueryKey] });
  };
}

/**
 * Saving the privacy choices.
 *
 * @returns saveProfile(audience), saveLibrary(audience), saveOnline(shouldShow),
 *   saveSuggest(shouldSuggest), saveReaderLevel(visibility, G7a), savePersonalDetails(shouldCheck,
 *   MUST-1b), saveReadingSuggestions(shouldSuggest, S1-E15-06), isSaving and hasFailed
 */
export function useSavePrivacySettings() {
  const refresh = usePrivacyRefresh();
  const profile = usePrivacySave<ProfileAudience>(saveProfileAudience, refresh);
  const library = usePrivacySave<LibraryAudience>(saveLibraryAudience, refresh);
  const online = usePrivacySave<boolean>(saveShowsOnlineStatus, refresh);
  const suggest = usePrivacySave<boolean>(saveSuggestMe, refresh);
  const readerLevel = usePrivacySave<ReaderLevelVisibility>(saveReaderLevelVisibility, refresh);
  const personalDetails = usePrivacySave<boolean>(saveChecksPersonalDetails, refresh);
  const readingSuggestions = usePrivacySave<boolean>(saveSuggestsFromReading, refresh);
  const mutations = [
    profile,
    library,
    online,
    suggest,
    readerLevel,
    personalDetails,
    readingSuggestions,
  ];
  return {
    savePersonalDetails: (shouldCheck: boolean) => personalDetails.mutateAsync(shouldCheck),
    saveReadingSuggestions: (shouldSuggest: boolean) =>
      readingSuggestions.mutateAsync(shouldSuggest),
    saveReaderLevel: (visibility: ReaderLevelVisibility) => readerLevel.mutateAsync(visibility),
    saveSuggest: (shouldSuggest: boolean) => suggest.mutateAsync(shouldSuggest),
    saveProfile: (audience: ProfileAudience) => profile.mutateAsync(audience),
    saveLibrary: (audience: LibraryAudience) => library.mutateAsync(audience),
    saveOnline: (shouldShow: boolean) => online.mutateAsync(shouldShow),
    isSaving: mutations.some((mutation) => mutation.isPending),
    hasFailed: mutations.some((mutation) => mutation.isError),
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
