/**
 * useStaffPrompts: the staff page's writing prompts: the list, saving and deleting (bundle
 * GAPS-12c).
 *
 * Who calls it: StaffHubPage. What it calls: api/hubPrompts.ts. After a save or a delete the
 * staff list and the hub's own list are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { deletePrompt, fetchStaffPrompts, savePrompt, type PromptDraft } from '../api/hubPrompts';
import { hubStaffFailureOf } from '../api/hubStaffErrors';

import { hubPromptsKey } from './useHubPrompts';

const staffPromptsKey = ['staff-hub', 'prompts'];

/**
 * The prompts and how to change them.
 *
 * @returns the query, save and remove, whether a change is running and why the last one failed
 */
export function useStaffPrompts() {
  const queryClient = useQueryClient();
  const prompts = useQuery({
    queryKey: staffPromptsKey,
    retry: false,
    queryFn: async () => fetchStaffPrompts(await requireClient()),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: staffPromptsKey });
    await queryClient.invalidateQueries({ queryKey: hubPromptsKey });
  };
  const save = useMutation({
    mutationFn: async (draft: PromptDraft) => savePrompt(await requireClient(), draft),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (promptId: string) => deletePrompt(await requireClient(), promptId),
    onSuccess: refresh,
  });
  return {
    prompts,
    save,
    remove,
    isChanging: save.isPending || remove.isPending,
    changeFailure: hubStaffFailureOf(save.error ?? remove.error),
  };
}
