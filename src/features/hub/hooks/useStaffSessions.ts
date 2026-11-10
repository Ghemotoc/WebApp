/**
 * useStaffSessions: the staff page's live sessions: the list, saving and deleting (bundle
 * GAPS-12h).
 *
 * Who calls it: SessionsSection. What it calls: api/hubSessions.ts. After a save or a delete the
 * staff list and the hub's own list are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  deleteSession,
  fetchStaffSessions,
  saveSession,
  type SessionDraft,
} from '../api/hubSessions';
import { hubStaffFailureOf } from '../api/hubStaffErrors';

import { hubSessionsKey } from './useHubSessions';

const staffSessionsKey = ['staff-hub', 'sessions'];

/**
 * The sessions and how to change them.
 *
 * @returns the query, save and remove, whether a change is running and why the last one failed
 */
export function useStaffSessions() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: staffSessionsKey,
    retry: false,
    queryFn: async () => fetchStaffSessions(await requireClient()),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: staffSessionsKey });
    await queryClient.invalidateQueries({ queryKey: hubSessionsKey });
  };
  const save = useMutation({
    mutationFn: async (draft: SessionDraft) => saveSession(await requireClient(), draft),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (sessionId: string) => deleteSession(await requireClient(), sessionId),
    onSuccess: refresh,
  });
  return {
    sessions,
    save,
    remove,
    isChanging: save.isPending || remove.isPending,
    changeFailure: hubStaffFailureOf(save.error ?? remove.error),
  };
}
