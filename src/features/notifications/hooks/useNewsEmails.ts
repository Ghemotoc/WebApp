/**
 * useNewsEmails: whether the signed-in person gets occasional news emails, and changing it
 * (bundle WAITLIST-1).
 *
 * Who calls it: NewsEmailsSwitch in Settings › Notifications. What it calls: api/newsEmails.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchNewsEmails,
  NewsEmailsError,
  saveNewsEmails,
  type NewsEmailsFailure,
} from '../api/newsEmails';

/**
 * Loads the choice and offers save().
 *
 * @returns isOn (null while loading), loadFailed, save, isSaving and saveFailure
 */
export function useNewsEmails() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['news-emails', userId];
  const choice = useQuery<boolean>({
    queryKey,
    enabled: userId !== null,
    queryFn: async () => fetchNewsEmails(await requireClient(), userId ?? ''),
  });
  const saving = useMutation({
    mutationFn: async (wanted: boolean) => saveNewsEmails(await requireClient(), wanted),
    onSuccess: (_answer, wanted) => queryClient.setQueryData(queryKey, wanted),
  });
  let saveFailure: NewsEmailsFailure | null = null;
  if (saving.isError) {
    saveFailure = saving.error instanceof NewsEmailsError ? saving.error.failure : 'unreachable';
  }
  return {
    isOn: choice.data ?? null,
    loadFailed: choice.isError,
    save: (wanted: boolean) => saving.mutate(wanted),
    isSaving: saving.isPending,
    saveFailure,
  };
}
