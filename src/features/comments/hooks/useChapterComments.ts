/**
 * useChapterComments: a chapter's comments, page by page (story S1-E6-01).
 *
 * Who calls it: CommentsSection. What it calls: api/comments.ts → chapter_comments(). The first
 * page has the newest 20 top-level comments; "Show more comments" asks for the 20 before the last
 * one shown. After a post or a delete, useCommentActions refreshes every page at once.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchCommentsPage, type ChapterComment, type CommentsPage } from '../api/comments';

/**
 * The cache key for one chapter's comments, shared with useCommentActions.
 *
 * @param address - the chapter
 * @param userId - the signed-in person, or null (what each person sees differs: blocks, own
 *   hidden comments, what they may delete)
 * @returns the key
 */
export function commentsQueryKey(address: ChapterAddress, userId: string | null) {
  return ['chapter-comments', address.storySlug, address.chapterCode, userId];
}

/**
 * Where the next page starts: the oldest comment on the last page.
 *
 * @param lastPage - the page just read
 * @returns its last comment's createdAt, or undefined when there is no more
 */
function nextPageStart(lastPage: CommentsPage | null): string | undefined {
  if (lastPage === null || !lastPage.hasMore) return undefined;
  return lastPage.comments.at(-1)?.createdAt;
}

/**
 * Follows one chapter's comments.
 *
 * @param address - the chapter
 * @returns the first page's facts (null while loading or when the chapter can't be read), every
 *   comment loaded so far, whether there is more, showMore(), whether it is loading more, and
 *   loadFailed
 */
export function useChapterComments(address: ChapterAddress) {
  const { userId, isKnown } = useSession();
  const pages = useInfiniteQuery({
    queryKey: commentsQueryKey(address, userId),
    enabled: isKnown,
    initialPageParam: null as string | null,
    getNextPageParam: nextPageStart,
    queryFn: async ({ pageParam }) => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchCommentsPage(client, address, pageParam);
    },
  });
  const firstPage = pages.data?.pages[0] ?? null;
  const comments: ChapterComment[] = (pages.data?.pages ?? []).flatMap(
    (page) => page?.comments ?? [],
  );
  return {
    firstPage,
    comments,
    hasMore: pages.hasNextPage,
    showMore: () => void pages.fetchNextPage(),
    isLoadingMore: pages.isFetchingNextPage,
    loadFailed: pages.isError,
  };
}
