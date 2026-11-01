/**
 * Read and unread as React hooks (bundle FORUMS-1, part d; story S1-E8-04).
 *
 * Who calls it: ThreadPage (marks what is on screen as read), ForumsPage, ForumCategorySection
 * and ForumPage ("Mark all as read" and "Mark as read"), and NewForYou. What it calls:
 * api/forumReads.ts. After a mark, the index, the forums' lists and "New for you" read again so
 * their dots match; the open thread is left alone, so marking it never reloads the page.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchNewForYou, markForumsRead, markThreadRead } from '../api/forumReads';

import { forumsQueryKey } from './useForumIndex';

/** The reads whose dots change when something is marked read. */
const unreadReads = ['index', 'threads', 'new'];

/**
 * Refreshes every read that shows new posts.
 *
 * @returns a function that does it
 */
function useRefreshUnread() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      unreadReads.map((read) =>
        queryClient.invalidateQueries({ queryKey: [forumsQueryKey, read] }),
      ),
    );
}

/**
 * Marks a thread read up to the last post on screen, once the reader is signed in and the posts
 * have loaded, and again when more posts come in ("Show more replies", a new reply).
 *
 * @param threadNumber - the thread
 * @param lastShownPost - the highest post number on screen, or null while none is
 */
export function useMarkThreadRead(threadNumber: number, lastShownPost: number | null) {
  const { userId } = useSession();
  const refreshUnread = useRefreshUnread();
  const mark = useMutation({
    mutationFn: async (upToPost: number) =>
      markThreadRead(await requireClient(), threadNumber, upToPost),
    onSuccess: refreshUnread,
  });
  const { mutate } = mark;
  useEffect(() => {
    // A visitor has nothing to mark; a failed mark only means the dots stay as they were.
    if (userId === null || lastShownPost === null) return;
    mutate(lastShownPost);
  }, [userId, lastShownPost, mutate]);
}

/**
 * "Mark as read" on a forum or category, or "Mark all as read" with null.
 *
 * @returns run(forumSlug), isRunning and whether the last try failed
 */
export function useMarkForumsRead() {
  const refreshUnread = useRefreshUnread();
  const mark = useMutation({
    mutationFn: async (forumSlug: string | null) =>
      markForumsRead(await requireClient(), forumSlug),
    onSuccess: refreshUnread,
  });
  return { run: mark.mutate, isRunning: mark.isPending, failed: mark.isError };
}

/**
 * "New for you": the threads with new posts for the signed-in reader.
 *
 * @returns the threads (null while loading or for a visitor) and loadFailed
 */
export function useNewForYou() {
  const { userId } = useSession();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const read = useQuery({
    queryKey: [forumsQueryKey, 'new', userId, language],
    queryFn: async () => fetchNewForYou(await requireClient(), language),
    enabled: userId !== null,
  });
  return { threads: userId === null ? null : (read.data ?? null), loadFailed: read.isError };
}
