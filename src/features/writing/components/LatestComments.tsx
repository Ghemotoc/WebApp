/**
 * LatestComments: "Latest on your chapters" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1, "Latest comments").
 *
 * Board values: eyebrow "Comments", the 30 px heading, and up to three white cards: the
 * commenter's initial in a circle, their name, "on chapter n · 2 hours ago", the words, and a
 * "Reply" link to the comments under that chapter. These are the public comments the writer can
 * already read under the chapter, with the same rules (deleted, blocked and moderated comments
 * left out); never a list of readers (criterion 3). The board's "See all comments" leads to a
 * page that doesn't exist yet (docs/board-fixes.md).
 * Who uses it: YourWritingPage. Its cards come from writer_dashboard() (latest_comments).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';

import type { LatestComment } from '../api/dashboard';

/** One comment's card. */
function LatestCommentCard({ comment }: { comment: LatestComment }) {
  const { t, i18n } = useTranslation('writing');
  const when = timeAgo(comment.createdAt, i18n.language);
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-card">
      <span className="flex items-center gap-3">
        <PersonAvatar name={comment.displayName} handle={comment.handle} />
        <span className="flex min-w-0 flex-col">
          <Link
            to={`/u/${comment.handle}`}
            className="font-semibold break-words text-ink no-underline hover:underline"
          >
            {comment.displayName}
          </Link>
          <span className="text-[13px] text-meta">
            {t('dashboard.comments.onChapter', { number: comment.chapterPosition, when })}
          </span>
        </span>
      </span>
      <p className="m-0 text-[15px] leading-[1.6] break-words text-ink">{comment.body}</p>
      <Link
        to={`/s/${comment.storySlug}/${comment.chapterCode}#comments-heading`}
        aria-label={t('dashboard.comments.replyLabel', {
          name: comment.displayName,
          number: comment.chapterPosition,
        })}
        className="inline-flex min-h-6 items-center self-start text-sm font-semibold"
      >
        {t('dashboard.comments.reply')}
      </Link>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @param props.comments - the newest comments, newest first
 * @returns the section
 */
export function LatestComments({ comments }: { comments: LatestComment[] }) {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="dashboard-comments-heading" className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('dashboard.comments.eyebrow')}</Eyebrow>
        <h2
          id="dashboard-comments-heading"
          className="m-0 font-heading text-[30px] font-bold tracking-[-0.01em] text-heading"
        >
          {t('dashboard.comments.heading')}
        </h2>
      </div>
      {comments.length === 0 ? (
        <p className="m-0 text-body">{t('dashboard.comments.empty')}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 p-0">
          {comments.map((comment) => (
            <LatestCommentCard
              key={`${comment.chapterCode}-${comment.createdAt}`}
              comment={comment}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
