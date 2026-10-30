/**
 * useSettingsAdmin: every flag and named setting for Staff › Settings, and changing one
 * (story S1-E11-03).
 *
 * Who calls it: SettingsPage and its sections. What it calls: api/settingsAdmin.ts.
 * After a change, the staff screen and the app's own cached flags and public settings are read
 * again, so the admin sees the change at once; everyone else's app re-reads them within a minute
 * (useFeatureFlags and usePublicSettings).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { Json } from '@/lib/database.types';

import { fetchAllFlags, fetchAllSettings, setFlag, setSetting } from '../api/settingsAdmin';

import { shownFailureOf } from './settingsFailure';

/** One change: a flag switched, or a setting given a new value. */
export type SettingsChange =
  { kind: 'flag'; key: string; turnOn: boolean } | { kind: 'value'; key: string; value: Json };

/**
 * Carries out one change.
 *
 * @param change - what to change
 */
async function applyChange(change: SettingsChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'flag') {
    await setFlag(client, change.key, change.turnOn);
    return;
  }
  await setSetting(client, change.key, change.value);
}

/**
 * Follows the flags and the settings.
 *
 * @returns the flags, the settings, their load state, change() and the last change's state
 */
export function useSettingsAdmin() {
  const queryClient = useQueryClient();
  const flags = useQuery({
    queryKey: ['settings-admin', 'flags'],
    retry: false,
    queryFn: async () => fetchAllFlags(await requireClient()),
  });
  const settings = useQuery({
    queryKey: ['settings-admin', 'values'],
    retry: false,
    queryFn: async () => fetchAllSettings(await requireClient()),
  });
  const mutation = useMutation({
    mutationFn: applyChange,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-admin'] });
      await queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });
  return {
    flags: flags.data ?? [],
    settings: settings.data ?? [],
    isLoading: flags.isPending || settings.isPending,
    loadFailure:
      shownFailureOf(flags.isError, flags.error) ??
      shownFailureOf(settings.isError, settings.error),
    change: (change: SettingsChange) => mutation.mutateAsync(change),
    isChanging: mutation.isPending,
    /** The change that failed last, so only its row shows the message. */
    failedChange: mutation.isError ? mutation.variables : null,
    changeFailure: shownFailureOf(mutation.isError, mutation.error),
    resetFailure: () => mutation.reset(),
  };
}

/** What useSettingsAdmin returns, for the sections' props. */
export type SettingsAdminState = ReturnType<typeof useSettingsAdmin>;
