/**
 * CommentItem: one comment, with its replies one level deep (story S1-E6-01; board 3.5).
 *
 * Board values: a 32 px round avatar on a comment and a reply alike (PersonAvatar, LOOK-7; CALM-3,
 * design system Avatar/README.md), then one meta line (board B05-ReaderEnd, BOOKS B05): the
 * author's name as a link to their profile, "Writer" in bold on the story's writer's comments,
 * "On paragraph 4" on a comment about one paragraph (S1-E6-06; a button that opens that
 * paragraph's thread, CommentParagraphLink) and the date ("2 days ago"), joined by middots; then
 * the words. A reply sits under its comment after a fine line, 16 px in, with no bar at its left
 * edge (canvas comments, 23 Nov 2026). Each part is a real <article> with the author named, so a
 * screen reader can move from comment to comment. While the writer has paused
 * new comments, Reply is hidden; likes, reactions, Report and More stay (bundle CALM-8; the design
 * handover's Step 4, point 7).
 * Who uses it: CommentsSection (and itself, for replies). What it calls: CommentBody,
 * CommentActions (with CommentReactions at the start of its row, S1-E6-02), CommentComposer (the
 * reply box).
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { ChapterComment } from '../api/comments';
import { timeAgo } from '../lib/timeAgo';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentActions } from './CommentActions';
import { CommentBody } from './CommentBody';
import { CommentComposer } from './CommentComposer';
import { CommentParagraphLink } from './CommentParagraphLink';
import { CommentQuoteLine } from './CommentQuoteLine';
import { CommentReactions } from './CommentReactions';

/** What one comment needs. */
export interface CommentItemProps {
  address: ChapterAddress;
  comment: ChapterComment;
  isReply?: boolean;
  /** True inside a paragraph's thread (S1-E6-06), where replies have the shorter limit. */
  isInParagraphThread?: boolean;
  /** True while the writer has paused new comments (CALM-8): no Reply and no reply box. */
  isPaused?: boolean;
  /**
   * False inside a part's group in a stanza's panel, whose heading already shows the words
   * (READER-SELECT, board B13); everywhere else a comment on chosen words shows them above its text.
   */
  isQuoteShown?: boolean;
}

/**
 * The meta line: the name, "Writer" in bold on the writer's comments, "On paragraph 3" on a
 * top-level comment about one paragraph, and the date, joined by middots (board B05-ReaderEnd;
 * the simplified pages' meta line, CALM-2, replaces the Writer pill).
 *
 * @param props.comment - the comment
 * @param props.isReply - true for a reply, which never names a paragraph
 * @returns the comment's header line
 */
function CommentHeader({ comment, isReply }: { comment: ChapterComment; isReply: boolean }) {
  const { t, i18n } = useCommentsTranslation();
  return (
    <ul className="meta-line items-baseline">
      <li>
        <Link
          to={`/u/${comment.author.handle}`}
          className="hit-target type-body font-semibold text-ink no-underline hover:underline"
        >
          {comment.author.displayName}
        </Link>
      </li>
      {comment.isWriter && <li className="font-semibold text-ink">{t('comment.writer')}</li>}
      {!isReply && comment.paragraph !== null && (
        <li>
          <CommentParagraphLink place={comment.paragraph} />
        </li>
      )}
      <li>
        <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt, i18n.language)}</time>
      </li>
    </ul>
  );
}

/** What the part under a top-level comment needs: its reply box and its replies. */
interface CommentRepliesProps {
  address: ChapterAddress;
  comment: ChapterComment;
  /** True while the reader writes a reply (Reply was pressed, and comments aren't paused). */
  isReplying: boolean;
  /** Closes the reply box, after a post or on Cancel. */
  onReplyDone: () => void;
  isInParagraphThread: boolean;
}

/**
 * The reply box, while the reader writes a reply, and the replies one level deep.
 *
 * @returns the box and the group of replies; nothing when there is neither
 */
function CommentReplies(props: CommentRepliesProps) {
  const { address, comment } = props;
  const { t } = useCommentsTranslation();
  const name = comment.author.displayName;
  return (
    <>
      {props.isReplying && (
        <div className="mt-3">
          <CommentComposer
            address={address}
            replyTo={{ commentId: comment.id, authorName: name }}
            onDone={props.onReplyDone}
            isOnParagraph={props.isInParagraphThread || comment.paragraph !== null}
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
    </>
  );
}

/**
 * The chosen words to show above a comment: a top-level comment's, unless its group's heading
 * already shows them (READER-SELECT, board B13).
 *
 * @param comment - the comment
 * @param isReply - replies never show words
 * @param isQuoteShown - false inside a part's group
 * @returns the words, or null
 */
function shownQuote(comment: ChapterComment, isReply: boolean, isQuoteShown: boolean) {
  if (isReply || !isQuoteShown) return null;
  return comment.quote;
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
  isPaused = false,
  isQuoteShown = true,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const name = comment.author.displayName;
  // Replies are one level deep, and nobody replies during a pause (CALM-8): a box left open when
  // the pause began closes too, as the database would refuse what it sends.
  const canReply = !isReply && !isPaused;
  return (
    <article
      aria-label={name}
      className={cn('flex gap-4', isReply ? 'mt-4 border-t border-hairline pt-4 pl-4' : 'py-4')}
    >
      {/* 32 px on a comment and a reply alike (CALM-3, design system Avatar/README.md). */}
      <PersonAvatar name={name} handle={comment.author.handle} size="small" />
      <div className="min-w-0 flex-1">
        <CommentHeader comment={comment} isReply={isReply} />
        <CommentQuoteLine quote={shownQuote(comment, isReply, isQuoteShown)} />
        <CommentBody comment={comment} />
        <CommentActions
          address={address}
          comment={comment}
          onReply={canReply ? () => setIsReplying(true) : null}
          before={<CommentReactions address={address} comment={comment} />}
        />
        <CommentReplies
          address={address}
          comment={comment}
          isReplying={canReply && isReplying}
          onReplyDone={() => setIsReplying(false)}
          isInParagraphThread={isInParagraphThread}
        />
      </div>
    </article>
  );
}
