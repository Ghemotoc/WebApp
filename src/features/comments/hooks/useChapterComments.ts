/**
 * useChapterComments: a chapter's comments, page by page (story S1-E6-01; the order choice,
 * BOOKS B05, user story 2.5).
 *
 * Who calls it: CommentsSection. What it calls: api/comments.ts → chapter_comments(). The first
 * page has 20 top-level comments, newest first unless the reader picked oldest first; "Show more
 * comments" asks for the 20 after the last one shown, in the same order. After a post or a delete,
 * useCommentActions refreshes every page at once (its key is the start of this one's).
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchCommentsPage,
  type ChapterComment,
  type CommentOrder,
  type CommentsPage,
} from '../api/comments';

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
 * Where the next page starts: the last comment on the last page.
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
 * @param order - 'newest' (the default) or 'oldest' first
 * @returns the first page's facts (null while loading or when the chapter can't be read), every
 *   comment loaded so far, whether there is more, showMore(), whether it is loading more, and
 *   loadFailed
 */
export function useChapterComments(address: ChapterAddress, order: CommentOrder = 'newest') {
  const { userId, isKnown } = useSession();
  const pages = useInfiniteQuery({
    // Each order is its own list in the cache, under the key the actions refresh.
    queryKey: [...commentsQueryKey(address, userId), order],
    enabled: isKnown,
    initialPageParam: null as string | null,
    getNextPageParam: nextPageStart,
    // While the other order loads, the list shown stays up instead of the grey shapes.
    placeholderData: (previous) => previous,
    queryFn: async ({ pageParam }) => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchCommentsPage(client, address, { pageAfter: pageParam, order });
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
