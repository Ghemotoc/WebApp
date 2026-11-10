/**
 * WriterCommentCard: one reader's comment as the writer sees it on the Write page and on
 * /write/comments (story S1-E3-07; bundle GAPS-5; board Write, "Latest on your chapters").
 *
 * The commenter's picture or initial, their name as a link to their profile, "on chapter n · 2
 * hours ago" (with the story's title on the page of every comment), the words, and "Reply", a
 * link to the comments under that chapter. A comment cut short ends in "…": the chapter holds
 * the rest. Who uses it: LatestComments and ChapterCommentsPage. What it calls: PersonAvatar and
 * timeAgo.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { LatestComment } from '../api/dashboard';

/** What the card needs. */
export interface WriterCommentCardProps {
  comment: LatestComment;
  /** The story's title, where comments from several stories sit together; else left out. */
  storyTitle?: string;
  /** True when the words were cut short. */
  isShortened?: boolean;
}

/**
 * Renders the card as a list item.
 *
 * @returns the card
 */
export function WriterCommentCard({
  comment,
  storyTitle,
  isShortened = false,
}: WriterCommentCardProps) {
  const { t, i18n } = useTranslation('writing');
  const when = timeAgo(comment.createdAt, i18n.language);
  const where =
    storyTitle === undefined
      ? t('dashboard.comments.onChapter', { number: comment.chapterPosition, when })
      : t('dashboard.comments.onChapterOf', {
          number: comment.chapterPosition,
          title: storyTitle,
          when,
        });
  return (
    <li
      data-testid="writer-comment"
      className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-card"
    >
      <span className="flex items-center gap-3">
        <PersonAvatar name={comment.displayName} handle={comment.handle} />
        <span className="flex min-w-0 flex-col">
          <Link
            to={`/u/${comment.handle}`}
            className="font-semibold break-words text-ink no-underline hover:underline"
          >
            {comment.displayName}
          </Link>
          <span className="text-[13px] break-words text-meta">{where}</span>
        </span>
      </span>
      <p className="m-0 text-[15px] leading-[1.6] break-words whitespace-pre-line text-ink">
        {comment.body}
        {isShortened && '…'}
      </p>
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
