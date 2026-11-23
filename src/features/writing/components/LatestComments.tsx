/**
 * LatestComments: "Latest on your chapters" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1, "Latest comments").
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): the plain heading with "See all
 * comments" as a text button at its right, and up to three rows split by the hairline: the
 * commenter's picture or initial, their name, "on chapter n · 2 hours ago", the words, and a
 * "Reply" link to the comments under that chapter. These are the public comments the writer can
 * already read under the chapter, with the same rules (deleted, blocked and moderated comments
 * left out); never a list of readers (criterion 3). "See all comments" beside the heading opens
 * /write/comments, every comment a page at a time (GAPS-5); it shows once there is a comment.
 * Who uses it: YourWritingPage. Its cards (WriterCommentCard) come from writer_dashboard()
 * (latest_comments).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import type { LatestComment } from '../api/dashboard';

import { WriterCommentCard } from './WriterCommentCard';

/**
 * Renders the section.
 *
 * @param props.comments - the newest comments, newest first
 * @returns the section
 */
export function LatestComments({ comments }: { comments: LatestComment[] }) {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="dashboard-comments-heading" className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <h2 id="dashboard-comments-heading" className="m-0 type-heading text-ink-heading">
          {t('dashboard.comments.heading')}
        </h2>
        {comments.length > 0 && (
          <Link to="/write/comments" className={buttonClassName({ variant: 'text' })}>
            {t('dashboard.comments.seeAll')}
          </Link>
        )}
      </div>
      {comments.length === 0 ? (
        <p className="m-0 type-body text-ink-muted">{t('dashboard.comments.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {comments.map((comment) => (
            <WriterCommentCard
              key={`${comment.chapterCode}-${comment.createdAt}`}
              comment={comment}
              look="row"
            />
          ))}
        </ul>
      )}
    </section>
  );
}
