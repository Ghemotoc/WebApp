/**
 * LatestComments: "Latest on your chapters" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1, "Latest comments").
 *
 * Board values: eyebrow "Comments", the 30 px heading, and up to three white cards: the
 * commenter's initial in a circle, their name, "on chapter n · 2 hours ago", the words, and a
 * "Reply" link to the comments under that chapter. These are the public comments the writer can
 * already read under the chapter, with the same rules (deleted, blocked and moderated comments
 * left out); never a list of readers (criterion 3). "See all comments" beside the heading opens
 * /write/comments, every comment a page at a time (GAPS-5); it shows once there is a comment.
 * Who uses it: YourWritingPage. Its cards (WriterCommentCard) come from writer_dashboard()
 * (latest_comments).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
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
    <section aria-labelledby="dashboard-comments-heading" className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{t('dashboard.comments.eyebrow')}</Eyebrow>
          <h2
            id="dashboard-comments-heading"
            className="m-0 font-heading text-[30px] font-bold tracking-[-0.01em] text-heading"
          >
            {t('dashboard.comments.heading')}
          </h2>
        </div>
        {comments.length > 0 && (
          <Link
            to="/write/comments"
            className="inline-flex min-h-6 items-center text-sm font-semibold"
          >
            {t('dashboard.comments.seeAll')}
          </Link>
        )}
      </div>
      {comments.length === 0 ? (
        <p className="m-0 text-body">{t('dashboard.comments.empty')}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 p-0">
          {comments.map((comment) => (
            <WriterCommentCard
              key={`${comment.chapterCode}-${comment.createdAt}`}
              comment={comment}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
