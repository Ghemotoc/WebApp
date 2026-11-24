/**
 * CommentsSection: "Comments" under the chapter (story S1-E6-01; board 3.5).
 *
 * Board values: the heading "86 comments" (28 px, Funnel Display; no eyebrow since board B02) with
 * "Newest first" beside it, the composer card, then one white card (24 px corners) listing the
 * comments with fine lines between them, and "Show more comments" under it. A visitor gets a
 * "Get in to comment" link instead of the composer; with comments off the section says so and
 * lists nothing (the story's setting, S1-E3-05). While the writer has paused new comments, the
 * line "New comments are paused until …" stands where the composer was and Reply is hidden (bundle
 * CALM-8; the design handover's Step 4, points 5 and 7). No doodles (DoD: none on the reader).
 * Who uses it: src/features/reading/components/ChapterComments.tsx, which fetches this file after
 * the chapter text. What it calls: useChapterComments → chapter_comments(); CommentComposer;
 * CommentsPausedLine; CommentItem.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PlaceholderComments } from '@/components/ui/PlaceholderComments';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { runningPauseEnd } from '@/lib/comment-pause';

import type { CommentsPage } from '../api/comments';
import { useChapterComments } from '../hooks/useChapterComments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { CommentsPausedLine } from './CommentsPausedLine';

/**
 * The composer for a member, the log-in link for a visitor.
 *
 * @param props.address - the chapter the comment goes on
 * @param props.focusOnMount - true when the box comes back after "Resume now" (CALM-8), so it
 *   takes the focus
 * @returns the way to add a comment
 */
function AddComment({ address, focusOnMount }: { address: ChapterAddress; focusOnMount: boolean }) {
  const { t } = useCommentsTranslation();
  const { userId } = useSession();
  if (userId === null) {
    return (
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center self-start rounded-full button-glass px-4 type-body font-semibold no-underline"
      >
        {t('section.logIn')}
      </Link>
    );
  }
  return <CommentComposer address={address} focusOnMount={focusOnMount} />;
}

/** What the line above the list needs. */
interface CommentEntryProps {
  address: ChapterAddress;
  page: CommentsPage;
  /** When the writer's pause of new comments ends, while it runs (CALM-8); otherwise null. */
  pauseEnd: Date | null;
}

/**
 * What sits above the list: the way to add a comment, or a line saying why there is none (the
 * writer turned comments off, paused new comments for a while, CALM-8, or takes them from
 * followers only, MUST-1a).
 *
 * @returns the composer, the log-in link or the line
 */
function CommentEntry({ address, page, pauseEnd }: CommentEntryProps) {
  const { t } = useCommentsTranslation();
  // CALM-8: true once the writer's "Resume now" has worked; the box that comes back in place of
  // the line then takes the focus, so the writer isn't left on a button that has gone.
  const [hasResumed, setHasResumed] = useState(false);
  if (!page.commentsEnabled)
    return <p className="m-0 type-body text-ink-muted">{t('section.off')}</p>;
  // CALM-8: nobody can post during a pause, the writer included, so this line comes before the
  // followers-only one and shows to visitors too.
  if (pauseEnd !== null) {
    return (
      <CommentsPausedLine
        address={address}
        end={pauseEnd}
        canResume={page.pause.canResume}
        onResumed={() => setHasResumed(true)}
      />
    );
  }
  if (!page.audienceAllowsMe) {
    return <p className="m-0 type-body text-ink-muted">{t('section.followersOnly')}</p>;
  }
  return <AddComment address={address} focusOnMount={hasResumed} />;
}

/**
 * Renders the section.
 *
 * @param props.address - the chapter the comments are on
 * @returns the comments area, or nothing while it loads or when the chapter can't be read
 */
export function CommentsSection({ address }: { address: ChapterAddress }) {
  const { t } = useCommentsTranslation();
  const comments = useChapterComments(address);
  if (comments.loadFailed) return <Notice tone="error">{t('section.loadFailed')}</Notice>;
  const firstPage = comments.firstPage;
  // Grey comment shapes after 300 ms while the first page loads (design books item 15).
  if (firstPage === null) {
    return (
      <section aria-labelledby="comments-heading" className="mt-12 flex flex-col">
        <h2
          id="comments-heading"
          className="m-0 font-heading type-heading font-bold tracking-[-0.01em] text-ink-heading"
        >
          {t('section.eyebrow')}
        </h2>
        <PlaceholderComments label={t('paragraph.loading')} />
      </section>
    );
  }
  // The list was read a little while ago, so a pause that has ended since counts as none.
  const pauseEnd = runningPauseEnd(firstPage.pause.pausedUntil, new Date());
  const isPaused = pauseEnd !== null;
  return (
    <section aria-labelledby="comments-heading" className="mt-12 flex flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {/* No eyebrow over "212 comments": it would repeat the heading (board B02; COPY-1). */}
        <h2
          id="comments-heading"
          className="m-0 font-heading type-heading font-bold tracking-[-0.01em] text-ink-heading"
        >
          {t('section.heading', { count: firstPage.total })}
        </h2>
        {firstPage.total > 0 && (
          <span className="type-body text-ink-muted">{t('section.newestFirst')}</span>
        )}
      </div>
      <CommentEntry address={address} page={firstPage} pauseEnd={pauseEnd} />
      {firstPage.commentsEnabled && !isPaused && comments.comments.length === 0 && (
        <p className="m-0 mt-4 type-body text-ink-muted">{t('section.empty')}</p>
      )}
      {comments.comments.length > 0 && (
        <div className="mt-4 divide-y divide-hairline rounded-card border border-border bg-surface px-6 py-1 shadow-[0_1px_2px_rgba(38,20,46,0.04),0_18px_40px_-28px_rgba(38,20,46,0.3)]">
          {comments.comments.map((comment) => (
            <CommentItem key={comment.id} address={address} comment={comment} isPaused={isPaused} />
          ))}
        </div>
      )}
      {comments.hasMore && (
        <Button
          variant="secondary"
          className="mt-4 self-start"
          disabled={comments.isLoadingMore}
          onClick={comments.showMore}
        >
          {t('section.showMore')}
        </Button>
      )}
    </section>
  );
}
