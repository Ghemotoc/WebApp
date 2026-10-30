/**
 * useNameRules: the reserved names and one language's username words for Staff › Settings, and
 * adding or removing one (stories S1-E11-03 and S1-E2-04).
 *
 * Who calls it: ReservedNamesSection and NameWordsSection. What it calls: api/nameRules.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  addNameWord,
  addReservedName,
  fetchNameWords,
  fetchReservedNames,
  removeNameWord,
  removeReservedName,
  type MatchRule,
} from '../api/nameRules';

import { shownFailureOf } from './settingsFailure';

/** One change to the name rules. */
export type NameRuleChange =
  | { kind: 'add_name'; name: string; matchRule: MatchRule }
  | { kind: 'remove_name'; id: string }
  | { kind: 'add_word'; language: string; word: string; matchRule: MatchRule }
  | { kind: 'remove_word'; id: string };

/**
 * Carries out one change.
 *
 * @param change - what to add or remove
 */
async function applyChange(change: NameRuleChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'add_name') return addReservedName(client, change.name, change.matchRule);
  if (change.kind === 'remove_name') return removeReservedName(client, change.id);
  if (change.kind === 'add_word') {
    return addNameWord(client, change.language, change.word, change.matchRule);
  }
  return removeNameWord(client, change.id);
}

/**
 * Follows the reserved names and the words matching a search.
 *
 * @param wordLanguage - which list to search, 'ro' or 'en'
 * @param wordSearch - part of a word; empty for the first ones
 * @returns the names, the words, their totals and load state, and change()
 */
export function useNameRules(wordLanguage: string, wordSearch: string) {
  const queryClient = useQueryClient();
  const names = useQuery({
    queryKey: ['settings-admin', 'reserved-names'],
    retry: false,
    queryFn: async () => fetchReservedNames(await requireClient()),
  });
  const words = useQuery({
    queryKey: ['settings-admin', 'name-words', wordLanguage, wordSearch],
    retry: false,
    queryFn: async () => fetchNameWords(await requireClient(), wordLanguage, wordSearch),
  });
  const mutation = useMutation({
    mutationFn: applyChange,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-admin'] }),
  });
  return {
    names: names.data ?? [],
    words: words.data?.words ?? [],
    wordTotal: words.data?.total ?? 0,
    loadFailure:
      shownFailureOf(names.isError, names.error) ?? shownFailureOf(words.isError, words.error),
    change: (change: NameRuleChange) => mutation.mutateAsync(change),
    isChanging: mutation.isPending,
    changeFailure: shownFailureOf(mutation.isError, mutation.error),
    resetFailure: () => mutation.reset(),
  };
}

/** What useNameRules returns, for the sections' props. */
export type NameRulesState = ReturnType<typeof useNameRules>;
