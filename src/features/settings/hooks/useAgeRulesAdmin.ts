/**
 * useAgeRulesAdmin: the age rules by country and saving one (bundle MARKETS-1, story S1-E2-21).
 *
 * Who calls it: AgeRulesSection. What it calls: useAgeRules (the public read) and
 * api/ageRulesAdmin.ts. A save reads the rules again for every screen (sign-up, the privacy
 * notice), so the change applies to new sign-ups at once (criterion 2).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { ageRulesQueryKey, useAgeRules } from '@/features/auth/hooks/useAgeRules';

import { saveAgeRule, type AgeRuleDraft } from '../api/ageRulesAdmin';

import { shownFailureOf } from './settingsFailure';

/** What a save needs. */
export interface AgeRuleSave {
  rule: AgeRuleDraft;
  reason: string;
}

/**
 * Follows the rules and offers the save.
 *
 * @returns rules, isLoading, loadFailure, save(rule, reason), isSaving, saveFailure and wasSaved
 */
export function useAgeRulesAdmin() {
  const queryClient = useQueryClient();
  const rules = useAgeRules();
  const saving = useMutation({
    mutationFn: async ({ rule, reason }: AgeRuleSave) =>
      saveAgeRule(await requireClient(), rule, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ageRulesQueryKey }),
  });
  return {
    rules: rules.data ?? [],
    isLoading: rules.isPending,
    loadFailure: shownFailureOf(rules.isError, rules.error),
    save: saving.mutateAsync,
    isSaving: saving.isPending,
    saveFailure: shownFailureOf(saving.isError, saving.error),
    wasSaved: saving.isSuccess,
    resetSave: saving.reset,
  };
}

/** The state AgeRulesSection and its parts share. */
export type AgeRulesAdminState = ReturnType<typeof useAgeRulesAdmin>;
