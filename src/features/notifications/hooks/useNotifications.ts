/**
 * useNotifications: the signed-in person's notifications, a page at a time (story S1-E7-01).
 *
 * Who calls it: NotificationsPage. What it calls: api/notifications.ts → my_notifications().
 * The counts (unread, and one per filter chip) come from the first page, which is always the
 * newest.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchNotifications, type NotificationsPage } from '../api/notifications';

/**
 * The cache key of the list, per person, so another account's list never shows.
 *
 * @param userId - the signed-in person (for the cache only)
 * @returns the key
 */
export function notificationsQueryKey(userId: string | null) {
  return ['notifications', userId] as const;
}

/**
 * Loads the list.
 *
 * @returns notifications (every page loaded so far), the first page's counts, loadMore,
 *   hasMore, isLoaded, isLoadingMore and loadFailed
 */
export function useNotifications() {
  const { userId } = useSession();
  const list = useInfiniteQuery<NotificationsPage>({
    queryKey: notificationsQueryKey(userId),
    enabled: userId !== null,
    initialPageParam: null,
    // Step 1: the next page starts after the oldest notification shown so far.
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.notifications.at(-1)?.at ?? null) : null,
    queryFn: async ({ pageParam }) =>
      fetchNotifications(await requireClient(), pageParam as string | null),
    // Step 2: like the bell, read again when the person comes back to the tab.
    refetchOnWindowFocus: true,
  });
  const firstPage = list.data?.pages[0] ?? null;
  return {
    notifications: list.data?.pages.flatMap((page) => page.notifications) ?? [],
    unread: firstPage?.unread ?? 0,
    counts: firstPage?.counts ?? null,
    loadMore: () => void list.fetchNextPage(),
    hasMore: list.hasNextPage,
    isLoaded: list.isSuccess,
    isLoadingMore: list.isFetchingNextPage,
    loadFailed: list.isError,
  };
}
