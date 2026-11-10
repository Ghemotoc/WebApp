/**
 * useHubSessions: the live sessions coming up for the signed-in member, and Remind me (bundle
 * GAPS-12h).
 *
 * Who calls it: HubSessions. What it calls: api/hubSessions.ts, and useSession so a visitor who
 * isn't signed in never asks the database.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubSessions, setSessionReminder, type HubSession } from '../api/hubSessions';

/** The first part of the cache key, shared so a staff change can refresh every member's list. */
export const hubSessionsKey = ['hub-sessions'];

/** What the hook gives. */
export interface HubSessionsState {
  /** The sessions, soonest first; empty while loading, signed out or when there are none. */
  sessions: HubSession[];
  loadFailed: boolean;
  /** Sets the reminder for a session, or takes it off. */
  remind: (sessionId: string, wanted: boolean) => void;
  isChanging: boolean;
  changeFailed: boolean;
}

/**
 * Follows the sessions coming up and this member's reminders.
 *
 * @returns the sessions and the way to ask for a reminder
 */
export function useHubSessions(): HubSessionsState {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  // One cache entry per person, because the list depends on their age group and reminders.
  const sessions = useQuery<HubSession[]>({
    queryKey: [...hubSessionsKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubSessions(await requireClient()),
  });
  const reminding = useMutation({
    mutationFn: async (given: { sessionId: string; wanted: boolean }) =>
      setSessionReminder(await requireClient(), given.sessionId, given.wanted),
    // Read the list again either way: after a refusal the session may have started or gone.
    onSettled: async () => queryClient.invalidateQueries({ queryKey: hubSessionsKey }),
  });
  return {
    sessions: sessions.data ?? [],
    loadFailed: sessions.isError,
    remind: (sessionId, wanted) => reminding.mutate({ sessionId, wanted }),
    isChanging: reminding.isPending,
    changeFailed: reminding.isError,
  };
}
