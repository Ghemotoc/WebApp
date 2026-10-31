/**
 * useEmailSettings: the signed-in person's notification email choices, and saving one
 * (story S1-E7-02).
 *
 * Who calls it: NotificationEmailsSection in Settings. What it calls: api/emailSettings.ts.
 * A saved choice updates the list at once, so the drop-down shows what the database now holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchEmailSettings, saveEmailSetting, type EmailSetting } from '../api/emailSettings';

/**
 * Loads the choices and offers save().
 *
 * @returns settings (empty while loading), isLoaded, loadFailed, save, isSaving, saveFailed
 */
export function useEmailSettings() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['notification-email-settings', userId];
  const settings = useQuery<EmailSetting[]>({
    queryKey,
    enabled: userId !== null,
    queryFn: async () => fetchEmailSettings(await requireClient()),
  });
  const saving = useMutation({
    mutationFn: async (setting: EmailSetting) => saveEmailSetting(await requireClient(), setting),
    // Step 1: once saved, the row shows the new choice.
    onSuccess: (_nothing, setting) =>
      queryClient.setQueryData<EmailSetting[]>(queryKey, (rows) =>
        (rows ?? []).map((row) => (row.kind === setting.kind ? setting : row)),
      ),
  });
  return {
    settings: settings.data ?? [],
    isLoaded: settings.isSuccess,
    loadFailed: settings.isError,
    save: (setting: EmailSetting) => saving.mutate(setting),
    isSaving: saving.isPending,
    saveFailed: saving.isError,
  };
}
