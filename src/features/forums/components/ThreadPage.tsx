/**
 * ThreadPage: one thread with its numbered posts, at /forums/:forumSlug/:threadNumber (bundle
 * FORUMS-1, part b; S1-E8-02; board 5.2 Forum thread).
 *
 * Who shows it: the router; a forum's list, the index's latest post and every permalink link here.
 * What it shows: the heading, the posts in order (#1, #2…), "Show more replies", the reply card,
 * and the side column. A permalink (?post=7) reads at least as far as #7 and scrolls to it and
 * focuses it (criterion 3). An address with the wrong forum moves to the right one. Anyone can
 * read; signed out, the reply card says to log in. Part c keeps the posts picked to quote, which
 * each post's buttons change and the reply card sends (S1-E8-03).
 * What it calls: useForumThread → forum_thread(); useForumIndex for the breadcrumb;
 * useQuotePicks.
 */
import { useEffect } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ForumPost } from '../api/forumThreads';
import { useForumIndex } from '../hooks/useForumIndex';
import { useForumThread } from '../hooks/useForumThreads';
import { useQuotePicks } from '../hooks/useQuotePicks';
import { forumPath } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumPostCard } from './ForumPostCard';
import { ReplyForm } from './ReplyForm';
import { ThreadHeader } from './ThreadHeader';
import { ThreadSidePanel } from './ThreadSidePanel';

/**
 * The permalink's post number from the address.
 *
 * @param value - the "post" search parameter
 * @returns the number, or null when there is none or it isn't a whole number from 1
 */
function permalinkPost(value: string | null): number | null {
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number >= 1 ? number : null;
}

/**
 * Scrolls to and focuses the permalink's post once it is on the page.
 *
 * @param posts - the posts shown
 * @param wanted - the permalink's post number, or null
 */
function useScrollToPost(posts: ForumPost[], wanted: number | null) {
  const isShown = wanted !== null && posts.some((post) => post.number === wanted);
  useEffect(() => {
    if (!isShown) return;
    const card = document.getElementById(`post-${wanted}`);
    card?.scrollIntoView({ block: 'start' });
    card?.focus({ preventScroll: true });
  }, [isShown, wanted]);
}

/**
 * The posts, "Show more replies" and the reply card.
 *
 * @returns the main column
 */
function ThreadPosts({
  read,
  threadNumber,
}: {
  read: ReturnType<typeof useForumThread>;
  threadNumber: number;
}) {
  const { t } = useForumsTranslation();
  const quotePicks = useQuotePicks();
  const thread = read.thread;
  if (thread === undefined || thread === null) return null;
  // Quoting is for readers who may reply; everyone else sees no quote buttons.
  const picksForPosts = thread.canReply ? quotePicks : null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {read.posts.map((post) => (
          <li key={post.id}>
            <ForumPostCard
              post={post}
              forumSlug={thread.forumSlug}
              threadNumber={threadNumber}
              threadTitle={post.number === 1 ? thread.title : null}
              quotePicks={picksForPosts}
            />
          </li>
        ))}
      </ol>
      {read.hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={read.showMore} disabled={read.isLoadingMore}>
            {t('thread.showMore')}
          </Button>
        </div>
      )}
      <ReplyForm
        target={{ forumSlug: thread.forumSlug, threadNumber, posts: read.posts, quotePicks }}
        canReply={thread.canReply}
      />
    </div>
  );
}

/**
 * "This thread isn't here", with the way back to the forum.
 *
 * @param props.forumSlug - the forum in the address
 * @returns the note
 */
function ThreadNotFound({ forumSlug }: { forumSlug: string }) {
  const { t } = useForumsTranslation();
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="m-0 text-3xl font-extrabold">{t('thread.notFound')}</h1>
      <Link
        to={`/forums/${forumSlug}`}
        className="inline-flex min-h-6 items-center text-link underline"
      >
        {t('forum.back')}
      </Link>
    </div>
  );
}

/**
 * The thread, once it has loaded: its heading, posts and side column.
 *
 * @returns the page's body
 */
function ThreadContent({
  read,
  threadNumber,
}: {
  read: ReturnType<typeof useForumThread>;
  threadNumber: number;
}) {
  const { entries } = useForumIndex();
  const thread = read.thread;
  if (thread === undefined || thread === null) return null;
  const path = entries === null ? [] : forumPath(entries, thread.forumSlug);
  return (
    <>
      <ThreadHeader thread={thread} path={path} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ThreadPosts read={read} threadNumber={threadNumber} />
        <ThreadSidePanel thread={thread} />
      </div>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the thread, a "not here" note with the way back, or a load error
 */
export function ThreadPage() {
  const { t } = useForumsTranslation();
  const { forumSlug = '', threadNumber: numberText = '' } = useParams();
  const [searchParams] = useSearchParams();
  const threadNumber = Number(numberText);
  const wantedPost = permalinkPost(searchParams.get('post'));
  const read = useForumThread(threadNumber, wantedPost);
  useScrollToPost(read.posts, wantedPost);
  const movedTo = read.thread?.forumSlug;
  if (movedTo !== undefined && movedTo !== forumSlug) {
    // The thread lives in another forum (it was moved, or the address was typed): go there.
    return (
      <Navigate to={`/forums/${movedTo}/${threadNumber}?${searchParams.toString()}`} replace />
    );
  }
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.loadFailed && <Notice tone="error">{t('thread.loadFailed')}</Notice>}
      {read.thread === null && <ThreadNotFound forumSlug={forumSlug} />}
      <ThreadContent read={read} threadNumber={threadNumber} />
    </PageContainer>
  );
}
