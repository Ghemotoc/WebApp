/**
 * CommentItem: one comment, with its replies one level deep (story S1-E6-01; board 3.5).
 *
 * Board values: a 40 px round initial (34 px on a reply), the author's name as a link to their
 * profile (15 px bold), the "Writer" pill on the story's writer's comments, the date ("2 days
 * ago", 13 px), then the words in 16 px. A reply sits under its comment after a fine line, 18 px
 * in. Each part is a real <article> with the author named, so a screen reader can move from
 * comment to comment. A comment on one paragraph says which ("On paragraph 4", 13 px, 600, in the
 * link colour; S1-E6-06), or that the writer has since changed it.
 * Who uses it: CommentsSection (and itself, for replies). What it calls: CommentBody,
 * CommentActions (with CommentReactions at the start of its row, S1-E6-02), CommentComposer (the
 * reply box).
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { initialsOf } from '@/features/people/lib/formatting';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { ChapterComment } from '../api/comments';
import { timeAgo } from '../lib/timeAgo';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentActions } from './CommentActions';
import { CommentBody } from './CommentBody';
import { CommentComposer } from './CommentComposer';
import { CommentReactions } from './CommentReactions';

/** What one comment needs. */
export interface CommentItemProps {
  address: ChapterAddress;
  comment: ChapterComment;
  isReply?: boolean;
  /** True inside a paragraph's thread (S1-E6-06), where replies have the shorter limit. */
  isInParagraphThread?: boolean;
}

/**
 * The name, the "Writer" pill and the date.
 *
 * @returns the comment's header line
 */
function CommentHeader({ comment }: { comment: ChapterComment }) {
  const { t, i18n } = useCommentsTranslation();
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <Link
        to={`/u/${comment.author.handle}`}
        className="text-[15px] font-bold text-ink no-underline hover:underline"
      >
        {comment.author.displayName}
      </Link>
      {comment.isWriter && (
        <span className="inline-flex h-6 items-center justify-center gap-1.5 self-center rounded-full border border-border bg-tint px-2.5 text-xs leading-none font-bold whitespace-nowrap text-heading">
          {t('comment.writer')}
        </span>
      )}
      <time dateTime={comment.createdAt} className="text-[13px] text-meta">
        {timeAgo(comment.createdAt, i18n.language)}
      </time>
      {comment.isSpoiler && comment.body !== null && (
        <span className="inline-flex h-6 items-center justify-center self-center rounded-full border border-border bg-paper px-2.5 text-xs leading-none font-bold whitespace-nowrap text-body">
          {t('comment.spoiler')}
        </span>
      )}
    </div>
  );
}

/**
 * "On paragraph 4", or "On an earlier version", for a top-level comment on one paragraph
 * (S1-E6-06). A paragraph's own thread leaves it out (the comments there carry no paragraph).
 *
 * @returns the line, or nothing for a comment on the whole chapter
 */
function ParagraphLabel({ paragraph }: { paragraph: ChapterComment['paragraph'] }) {
  const { t } = useCommentsTranslation();
  if (paragraph === null) return null;
  return (
    <p className="m-0 mb-1 text-[13px] font-semibold text-link">
      {paragraph === 'earlier'
        ? t('comment.onEarlierVersion')
        : t('comment.onParagraph', { number: paragraph })}
    </p>
  );
}

/**
 * Renders the comment and, for a top-level one, its replies and the reply box.
 *
 * @returns the comment
 */
export function CommentItem({
  address,
  comment,
  isReply = false,
  isInParagraphThread = false,
}: CommentItemProps) {
  const { t } = useCommentsTranslation();
  const [isReplying, setIsReplying] = useState(false);
  const name = comment.author.displayName;
  return (
    <article
      aria-label={name}
      className={cn(
        'flex gap-3.5',
        isReply ? 'mt-4 border-t border-hairline pt-4 pl-[18px]' : 'py-5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex flex-none items-center justify-center rounded-full bg-[linear-gradient(140deg,#4D1B5E,#9A5BB8)] font-heading font-bold text-white',
          isReply ? 'size-[34px] text-sm' : 'size-10 text-base',
        )}
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        {!isReply && <ParagraphLabel paragraph={comment.paragraph} />}
        <CommentHeader comment={comment} />
        <CommentBody comment={comment} />
        <CommentActions
          address={address}
          comment={comment}
          onReply={isReply ? null : () => setIsReplying(true)}
          before={<CommentReactions address={address} comment={comment} />}
        />
        {isReplying && (
          <div className="mt-3">
            <CommentComposer
              address={address}
              replyTo={{ commentId: comment.id, authorName: name }}
              onDone={() => setIsReplying(false)}
              isOnParagraph={isInParagraphThread || comment.paragraph !== null}
            />
          </div>
        )}
        {comment.replies.length > 0 && (
          <div role="group" aria-label={t('comment.replies', { name })}>
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} address={address} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
