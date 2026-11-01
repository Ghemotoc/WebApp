/**
 * useThreadList and useForumThread: a forum's threads and a thread's posts, read a page at a time
 * (bundle FORUMS-1, part b; story S1-E8-02).
 *
 * Who calls it: ThreadList (on ForumPage) and ThreadPage. What it calls: api/forumThreads.ts →
 * forum_thread_list() and forum_thread(), which anyone may call, signed out included.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchThread,
  fetchThreadList,
  type ForumThreadListPage,
  type ForumThreadPage,
} from '../api/forumThreads';

import { forumsQueryKey } from './useForumIndex';

/**
 * Reads a forum's threads, latest activity first; "Show more threads" reads the next page.
 *
 * @param forumSlug - the forum's address
 * @returns the threads so far (null while loading, or for no such forum), hasMore, showMore(),
 *   isLoadingMore and loadFailed
 */
export function useThreadList(forumSlug: string) {
  const list = useInfiniteQuery({
    queryKey: [forumsQueryKey, 'threads', forumSlug],
    queryFn: async ({ pageParam }: { pageParam: string | null }) =>
      fetchThreadList(await requireClient(), forumSlug, pageParam),
    initialPageParam: null as string | null,
    // The next page starts after the oldest thread shown.
    getNextPageParam: (lastPage: ForumThreadListPage | null) =>
      lastPage?.hasMore === true ? (lastPage.threads.at(-1)?.lastPostAt ?? null) : null,
  });
  const pages = list.data?.pages ?? null;
  const firstPage = pages?.[0] ?? null;
  return {
    threads:
      firstPage === null || pages === null ? null : pages.flatMap((page) => page?.threads ?? []),
    hasMore: list.hasNextPage,
    showMore: () => void list.fetchNextPage(),
    isLoadingMore: list.isFetchingNextPage,
    loadFailed: list.isError,
  };
}

/**
 * The thread's heading from the reads so far: the latest read has the freshest numbers.
 *
 * @param pages - the reads, oldest first
 * @param isLoading - true before the first read arrives
 * @returns undefined while loading, null when the thread can't be opened, otherwise the heading
 */
function latestHeader(pages: (ForumThreadPage | null)[], isLoading: boolean) {
  if (isLoading) return undefined;
  const latest = pages.at(-1) ?? null;
  return latest === null ? null : latest.thread;
}

/** The cache key of one thread's reads; every forum write refreshes everything under forumsQueryKey. */
export function threadQueryKey(threadNumber: number, upToPost: number | null) {
  return [forumsQueryKey, 'thread', threadNumber, upToPost];
}

/**
 * Reads a thread with its posts; "Show more replies" reads the next ones. A permalink's post
 * number makes the first read reach that post.
 *
 * @param threadNumber - the number in the address
 * @param upToPost - the permalink's post number, or null
 * @returns the thread (undefined while loading, null when it can't be opened), the posts so far,
 *   hasMore, showMore(), isLoadingMore and loadFailed
 */
export function useForumThread(threadNumber: number, upToPost: number | null) {
  const read = useInfiniteQuery({
    // A new permalink reads afresh, so it reaches its post.
    queryKey: threadQueryKey(threadNumber, upToPost),
    queryFn: async ({ pageParam }: { pageParam: number }) =>
      fetchThread(await requireClient(), threadNumber, {
        afterPost: pageParam,
        upToPost: pageParam === 0 ? upToPost : null,
      }),
    initialPageParam: 0,
    // The next read starts after the last post shown.
    getNextPageParam: (lastPage: ForumThreadPage | null) =>
      lastPage?.hasMore === true ? (lastPage.posts.at(-1)?.number ?? null) : null,
    enabled: Number.isInteger(threadNumber) && threadNumber > 0,
  });
  const pages = read.data?.pages ?? [];
  return {
    thread: latestHeader(pages, read.data === undefined),
    posts: pages.flatMap((page) => page?.posts ?? []),
    hasMore: read.hasNextPage,
    showMore: () => void read.fetchNextPage(),
    isLoadingMore: read.isFetchingNextPage,
    loadFailed: read.isError,
  };
}
