/**
 * useMarkNotificationsRead: "Mark all as read", and marking one as read when it is opened
 * (story S1-E7-01, criterion 3).
 *
 * Who calls it: NotificationsPage and NotificationRow. What it calls: api/notifications.ts →
 * mark_notifications_read(). Afterwards the list and the bell are read again, so both show what
 * the database holds.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { markNotificationsRead } from '../api/notifications';

import { notificationsQueryKey } from './useNotifications';
import { unreadCountQueryKey } from './useUnreadNotificationCount';

/**
 * Marks notifications as read.
 *
 * @returns markAllRead(), markRead(id), isSaving and whether the last try failed
 */
export function useMarkNotificationsRead() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const mark = useMutation({
    mutationFn: async (notificationIds: string[] | null) =>
      markNotificationsRead(await requireClient(), notificationIds),
    onSuccess: async () => {
      // Step 1: the list and the badge both read again.
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(userId) });
    },
  });
  return {
    markAllRead: () => mark.mutate(null),
    markRead: (notificationId: string) => mark.mutate([notificationId]),
    isSaving: mark.isPending,
    saveFailed: mark.isError,
  };
}
