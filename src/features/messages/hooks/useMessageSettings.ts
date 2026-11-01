/**
 * The hooks that change Messages for the caller: who may message them, "Let adults message me"
 * and Delete chat (story S1-E9-04).
 *
 * Who calls them: MessageSettingsSection (Settings › Messages) and DeleteChatControl (About this
 * chat). What they call: api/messages.ts. After a change, every Messages query and the setup
 * steps' copy of the switch (S1-E2-06) are read again, so every screen agrees.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { myOnboardingQueryKey } from '@/features/onboarding/api/onboarding';

import {
  deleteConversation,
  setAdultsMayMessage,
  setMessageAudience,
  type MessageAudience,
} from '../api/messages';

import { messagesKeys } from './useMessages';

/**
 * Saving who may message the caller and the adults switch.
 *
 * @returns saveAudience(audience), saveAdultsMayMessage(allowed), isSaving and hasFailed
 */
export function useSaveMessageSettings() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  /** After a save, the notice, About this chat and the setup steps read the setting again. */
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: messagesKeys.settings });
    await queryClient.invalidateQueries({ queryKey: myOnboardingQueryKey(userId) });
  };
  const audience = useMutation({
    mutationFn: async (chosen: MessageAudience) =>
      setMessageAudience(await requireClient(), chosen),
    onSuccess: refresh,
  });
  const adults = useMutation({
    mutationFn: async (allowed: boolean) => setAdultsMayMessage(await requireClient(), allowed),
    onSuccess: refresh,
  });
  return {
    saveAudience: (chosen: MessageAudience) => audience.mutateAsync(chosen),
    saveAdultsMayMessage: (allowed: boolean) => adults.mutateAsync(allowed),
    isSaving: audience.isPending || adults.isPending,
    hasFailed: audience.isError || adults.isError,
  };
}

/**
 * Delete chat, for the caller only.
 *
 * @returns remove(handle), isDeleting, hasFailed and reset()
 */
export function useDeleteChat() {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (handle: string) => deleteConversation(await requireClient(), handle),
    // The list, the chat and the top bar's count all change.
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: messagesKeys.all }),
  });
  return {
    remove: (handle: string) => remove.mutateAsync(handle),
    isDeleting: remove.isPending,
    hasFailed: remove.isError,
    reset: () => remove.reset(),
  };
}
