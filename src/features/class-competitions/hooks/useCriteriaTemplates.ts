/**
 * A teacher's own criteria templates as React hooks (bundle CLASS-POINTS, part 2; story
 * S1-E8-19).
 *
 * Who calls it: TemplatePicker, SaveAsTemplate and CriteriaTemplatesPage. What it calls:
 * api/criteriaTemplates.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { competitionFailureOf } from '../api/competitionErrors';
import {
  deleteCriteriaTemplate,
  fetchCriteriaTemplates,
  saveCriteriaTemplate,
  type CriteriaTemplate,
  type TemplateRequest,
} from '../api/criteriaTemplates';

/** The cache key of the caller's templates. */
function templatesKey(userId: string | null) {
  return ['criteria-templates', userId] as const;
}

/**
 * The signed-in teacher's own templates.
 *
 * @returns the query: data is the list, by name
 */
export function useCriteriaTemplates() {
  const { userId } = useSession();
  return useQuery({
    queryKey: templatesKey(userId),
    queryFn: async () => fetchCriteriaTemplates(await requireClient()),
    enabled: userId !== null,
  });
}

/**
 * Saving and deleting templates. Each call answers with the list after the change, which goes
 * straight into the cache.
 *
 * @returns save(request), remove(templateId), the failure and isRunning
 */
export function useChangeCriteriaTemplates() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const keep = (templates: CriteriaTemplate[]) =>
    queryClient.setQueryData(templatesKey(userId), templates);
  const saving = useMutation({
    mutationFn: async (request: TemplateRequest) =>
      saveCriteriaTemplate(await requireClient(), request),
    onSuccess: keep,
  });
  const removing = useMutation({
    mutationFn: async (templateId: string) =>
      deleteCriteriaTemplate(await requireClient(), templateId),
    onSuccess: keep,
  });
  return {
    save: saving.mutateAsync,
    remove: removing.mutateAsync,
    failure: competitionFailureOf(saving.error ?? removing.error),
    isRunning: saving.isPending || removing.isPending,
  };
}
