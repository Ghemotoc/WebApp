/**
 * useNudgeWords: one language's kind-words nudge list for Staff › Settings, and adding or
 * removing a phrase (bundle ADMIN-2, part d3; Robert, 2 Nov 2026).
 *
 * Who calls it: NudgeWordsSection. What it calls: api/nudgeWords.ts. After a change it also marks
 * the comment box's own copy of the lists as stale, so a staff member sees the change at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { addNudgeWord, fetchNudgeWords, removeNudgeWord } from '../api/nudgeWords';

import { shownFailureOf } from './settingsFailure';

/** One change to a nudge list. */
export type NudgeWordChange =
  { kind: 'add'; language: string; phrase: string } | { kind: 'remove'; id: string };

/**
 * Carries out one change.
 *
 * @param change - what to add or remove
 */
async function applyChange(change: NudgeWordChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'add') return addNudgeWord(client, change.language, change.phrase);
  return removeNudgeWord(client, change.id);
}

/**
 * Follows the phrases matching a search on one list.
 *
 * @param language - which list, 'ro' or 'en'
 * @param search - part of a phrase; empty for the first ones
 * @returns the phrases, their total, any failure, change() and isChanging
 */
export function useNudgeWords(language: string, search: string) {
  const queryClient = useQueryClient();
  const words = useQuery({
    queryKey: ['settings-admin', 'nudge-words', language, search],
    retry: false,
    queryFn: async () => fetchNudgeWords(await requireClient(), language, search),
  });
  const mutation = useMutation({
    mutationFn: applyChange,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-admin', 'nudge-words'] });
      await queryClient.invalidateQueries({ queryKey: ['comment-nudge-words'] });
    },
  });
  return {
    words: words.data?.words ?? [],
    total: words.data?.total ?? 0,
    failure:
      shownFailureOf(words.isError, words.error) ??
      shownFailureOf(mutation.isError, mutation.error),
    change: (change: NudgeWordChange) => mutation.mutateAsync(change),
    isChanging: mutation.isPending,
  };
}

/** What useNudgeWords returns, for the section's parts. */
export type NudgeWordsState = ReturnType<typeof useNudgeWords>;
