/**
 * useCanvaConnection: whether the writer has connected Canva, and Disconnect (story S1-E3-12:
 * "the writer can disconnect in Settings").
 *
 * Who calls it: CanvaSettingsSection. What it calls: fetchCanvaConnection() (the writer's own
 * canva_connections row) and disconnectCanva() (our server, which also tells Canva to forget the
 * tokens). Signed out, it never asks the database.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { disconnectCanva, fetchCanvaConnection } from '../api/canva';

/** The cache key of the writer's Canva connection. */
const canvaConnectionKey = (userId: string | null) => ['canva-connection', userId];

/**
 * Follows the connection.
 *
 * @returns connectedSince (null when not connected), isLoaded, loadFailed, disconnect(),
 *   isDisconnecting and disconnectFailed
 */
export function useCanvaConnection() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const connection = useQuery({
    queryKey: canvaConnectionKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchCanvaConnection(await requireClient()),
  });
  const disconnecting = useMutation({
    mutationFn: async () => disconnectCanva(await requireClient()),
    onSuccess: () => queryClient.setQueryData(canvaConnectionKey(userId), null),
  });
  return {
    connectedSince: connection.data ?? null,
    isLoaded: connection.isSuccess,
    loadFailed: connection.isError,
    disconnect: () => disconnecting.mutate(),
    isDisconnecting: disconnecting.isPending,
    disconnectFailed: disconnecting.isError,
  };
}
