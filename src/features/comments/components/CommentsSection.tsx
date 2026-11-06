/**
 * CommentsSection: "Comments" under the chapter (story S1-E6-01; board 3.5).
 *
 * Board values: the eyebrow "Comments", the heading "86 comments" (28 px, Bricolage) with
 * "Newest first" beside it, the composer card, then one white card (24 px corners) listing the
 * comments with fine lines between them, and "Show more comments" under it. A visitor gets a
 * "Log in to comment" link instead of the composer; with comments off the section says so and
 * lists nothing (the story's setting, S1-E3-05). No doodles (DoD: none on the chapter reader).
 * Who uses it: src/features/reading/components/ChapterComments.tsx, which fetches this file after
 * the chapter text. What it calls: useChapterComments → chapter_comments(); CommentComposer;
 * CommentItem.
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { useChapterComments } from '../hooks/useChapterComments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';

/**
 * The composer for a member, the log-in link for a visitor.
 *
 * @returns the way to add a comment
 */
function AddComment({ address }: { address: ChapterAddress }) {
  const { t } = useCommentsTranslation();
  const { userId } = useSession();
  if (userId === null) {
    return (
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('section.logIn')}
      </Link>
    );
  }
  return <CommentComposer address={address} />;
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
  if (firstPage === null) return null;
  return (
    <section aria-labelledby="comments-heading" className="mt-14 flex flex-col">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{t('section.eyebrow')}</Eyebrow>
          <h2
            id="comments-heading"
            className="m-0 font-heading text-[28px] font-bold tracking-[-0.01em] text-heading"
          >
            {t('section.heading', { count: firstPage.total })}
          </h2>
        </div>
        {firstPage.total > 0 && (
          <span className="text-sm text-meta">{t('section.newestFirst')}</span>
        )}
      </div>
      {firstPage.commentsEnabled ? (
        <AddComment address={address} />
      ) : (
        <p className="m-0 text-base text-body">{t('section.off')}</p>
      )}
      {firstPage.commentsEnabled && comments.comments.length === 0 && (
        <p className="m-0 mt-4 text-base text-body">{t('section.empty')}</p>
      )}
      {comments.comments.length > 0 && (
        <div className="mt-4 divide-y divide-hairline rounded-[24px] border border-border bg-surface px-6 py-1 shadow-[0_1px_2px_rgba(38,20,46,0.04),0_18px_40px_-28px_rgba(38,20,46,0.3)]">
          {comments.comments.map((comment) => (
            <CommentItem key={comment.id} address={address} comment={comment} />
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
