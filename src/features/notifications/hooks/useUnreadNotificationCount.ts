/**
 * useUnreadNotificationCount: the number on the top bar's bell (story S1-E7-01, criterion 3).
 *
 * Who calls it: NotificationBell. What it calls: api/notifications.ts →
 * my_unread_notification_count().
 * Decision (READ-3): the count is read every minute and whenever the person comes back to the
 * tab, instead of a Realtime channel; Realtime can replace this later without changing the table.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchUnreadNotificationCount } from '../api/notifications';

/** How often the badge asks again, in milliseconds. */
const refreshEveryMilliseconds = 60_000;

/**
 * The cache key of the count, per person.
 *
 * @param userId - the signed-in person (for the cache only)
 * @returns the key
 */
export function unreadCountQueryKey(userId: string | null) {
  return ['notification-count', userId] as const;
}

/**
 * Loads the count while someone is signed in.
 *
 * @returns isSignedIn and the unread count (0 while loading or when it can't be read)
 */
export function useUnreadNotificationCount() {
  const { userId } = useSession();
  const count = useQuery<number>({
    queryKey: unreadCountQueryKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchUnreadNotificationCount(await requireClient()),
    refetchInterval: refreshEveryMilliseconds,
    refetchOnWindowFocus: true,
  });
  return { isSignedIn: userId !== null, unreadCount: count.data ?? 0 };
}
