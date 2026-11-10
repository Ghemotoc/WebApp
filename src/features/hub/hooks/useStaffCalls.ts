/**
 * useStaffCalls: the staff page's calls for submissions: the list, saving and deleting (bundle
 * GAPS-12d).
 *
 * Who calls it: CallsSection. What it calls: api/hubCalls.ts. After a save or a delete the staff
 * list and the hub's own list are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { deleteCall, fetchStaffCalls, saveCall, type CallDraft } from '../api/hubCalls';
import { hubStaffFailureOf } from '../api/hubStaffErrors';

import { hubCallsKey } from './useHubCalls';

const staffCallsKey = ['staff-hub', 'calls'];

/**
 * The calls and how to change them.
 *
 * @returns the query, save and remove, whether a change is running and why the last one failed
 */
export function useStaffCalls() {
  const queryClient = useQueryClient();
  const calls = useQuery({
    queryKey: staffCallsKey,
    retry: false,
    queryFn: async () => fetchStaffCalls(await requireClient()),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: staffCallsKey });
    await queryClient.invalidateQueries({ queryKey: hubCallsKey });
  };
  const save = useMutation({
    mutationFn: async (draft: CallDraft) => saveCall(await requireClient(), draft),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (callId: string) => deleteCall(await requireClient(), callId),
    onSuccess: refresh,
  });
  return {
    calls,
    save,
    remove,
    isChanging: save.isPending || remove.isPending,
    changeFailure: hubStaffFailureOf(save.error ?? remove.error),
  };
}
