/**
 * useUnreadMessageCount: the top bar's count of chats with an unread message (story S1-E9-01).
 *
 * Why it has its own file: the top bar is on every page, so whatever it imports is in the
 * download every page waits for, the chapter reader's included (whose script budget is checked by
 * e2e/reader-performance.spec.ts). Kept apart from useMessages.ts and api/messages.ts, the count
 * brings only itself; the chats, sending and settings load with the Messages page (bundle G8c).
 * Who calls it: MessagesNavLink (wide screens) and MessagesHeaderLink (phones).
 * What it calls: the database function unread_message_count(), every minute and when the person
 * comes back to the tab.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

/** How often the count asks again, in milliseconds (the notification bell's rhythm, READ-3). */
const refreshEveryMinute = 60_000;

/**
 * The count's cache key. useMessages.ts reuses it, so reading a chat refreshes the count.
 *
 * @param userId - the signed-in person, or null
 * @returns the key
 */
export function unreadMessagesKey(userId: string | null) {
  return ['messages', 'unread', userId] as const;
}

/**
 * Asks the database how many chats have an unread message.
 *
 * @returns the number
 * @throws Error when the database can't be reached; the hook then shows no number
 */
async function fetchUnreadCount(): Promise<number> {
  const client = await requireClient();
  const { data, error } = await client.rpc('unread_message_count');
  if (error !== null) throw new Error(`unread_message_count failed: ${error.code}`);
  return data;
}

/**
 * The count of chats with an unread message, while signed in.
 *
 * @returns isSignedIn and the count (0 while loading or when it can't be read)
 */
export function useUnreadMessageCount() {
  const { userId } = useSession();
  const count = useQuery<number>({
    queryKey: unreadMessagesKey(userId),
    enabled: userId !== null,
    refetchInterval: refreshEveryMinute,
    refetchOnWindowFocus: true,
    queryFn: fetchUnreadCount,
  });
  return { isSignedIn: userId !== null, unreadCount: count.data ?? 0 };
}
