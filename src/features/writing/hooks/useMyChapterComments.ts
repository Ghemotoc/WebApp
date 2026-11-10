/**
 * useMyChapterComments: the comments on the signed-in writer's chapters, a page at a time
 * (bundle GAPS-5; story S1-E3-07).
 *
 * Who calls it: ChapterCommentsPage (/write/comments). What it calls: api/chapterComments.ts →
 * my_chapter_comments(). Signed out, it never asks the database. Picking another story starts a
 * new list; the stories to pick from come from the first page.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyChapterComments, type ChapterCommentsPage } from '../api/chapterComments';

/**
 * Loads the list.
 *
 * @param storySlug - one of the writer's stories, or null for every story
 * @returns comments (every page loaded so far), the stories to pick from, loadMore, hasMore,
 *   isLoaded, isLoadingMore and loadFailed
 */
export function useMyChapterComments(storySlug: string | null) {
  const { userId } = useSession();
  const list = useInfiniteQuery<ChapterCommentsPage>({
    // Per person and per story, so another account's or another story's list never shows.
    queryKey: ['my-chapter-comments', userId, storySlug],
    enabled: userId !== null,
    initialPageParam: null,
    // The next page starts after the oldest comment shown so far.
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.comments.at(-1)?.createdAt ?? null) : null,
    queryFn: async ({ pageParam }) =>
      fetchMyChapterComments(await requireClient(), pageParam as string | null, storySlug),
  });
  return {
    comments: list.data?.pages.flatMap((page) => page.comments) ?? [],
    stories: list.data?.pages[0]?.stories ?? [],
    loadMore: () => void list.fetchNextPage(),
    hasMore: list.hasNextPage,
    isLoaded: list.isSuccess,
    isLoadingMore: list.isFetchingNextPage,
    loadFailed: list.isError,
  };
}
