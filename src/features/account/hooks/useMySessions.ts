/**
 * useMySessions: the signed-in person's devices, and logging them out (story S1-E2-05).
 *
 * Who calls it: SignedInDevicesSection. What it calls: src/features/auth/api/sessions.ts
 * (list_my_sessions(), end_my_session()) and api/signIn.ts (signOutOtherDevices()).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { endMySession, listMySessions, type MySession } from '@/features/auth/api/sessions';
import { signOutOtherDevices } from '@/features/auth/api/signIn';
import { useSession } from '@/features/auth/hooks/useSession';

import { requireClient } from './useMyNames';

/** The cache key of the signed-in person's devices. */
const sessionsKey = (userId: string | null) => ['my-sessions', userId];

/**
 * Follows the devices.
 *
 * @returns sessions, loadFailed, endOne (one device), endOthers (every other device) and
 *   actionFailed
 */
export function useMySessions() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const sessions = useQuery<MySession[]>({
    queryKey: sessionsKey(userId),
    enabled: userId !== null,
    queryFn: async () => listMySessions(await requireClient()),
  });

  // Either action reads the list again, so a logged-out device disappears.
  const refresh = () => queryClient.invalidateQueries({ queryKey: sessionsKey(userId) });
  const endOne = useMutation({
    mutationFn: async (sessionId: string) => endMySession(await requireClient(), sessionId),
    onSuccess: refresh,
  });
  const endOthers = useMutation({
    mutationFn: async () => signOutOtherDevices(await requireClient()),
    onSuccess: refresh,
  });

  return {
    sessions: sessions.data ?? [],
    isLoading: sessions.isPending && userId !== null,
    loadFailed: sessions.isError,
    endOne: (sessionId: string) => endOne.mutate(sessionId),
    endOthers: () => endOthers.mutate(),
    isBusy: endOne.isPending || endOthers.isPending,
    actionFailed: endOne.isError || endOthers.isError,
    othersEnded: endOthers.isSuccess,
  };
}
