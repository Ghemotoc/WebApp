/**
 * CommentActions: the row under a comment: Reply, Delete and Report (story S1-E6-01; board 3.5).
 *
 * - Reply (top-level comments only: replies go one level deep) opens the reply box.
 * - Delete, for the author and for the story's writer (criterion 3), asks "Delete this comment?"
 *   in place before it deletes.
 * - Report is the shared ReportButton (S1-E10-01; CLAUDE.md rule 6, DSA art. 16), on everyone
 *   else's comments, pushed to the right as on the board.
 * - Downvote (S1-E6-04), private, on everyone else's live comments for a signed-in reader, with
 *   the board's line under the row once it is on.
 * The reactions (S1-E6-02, CommentReactions) come first in the row, through the `before` slot.
 * Who uses it: CommentItem. What it calls: useDeleteComment → delete_comment(); ReportButton.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChapterComment } from '../api/comments';
import { useDeleteComment } from '../hooks/useCommentActions';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { DownvoteButton } from './DownvoteButton';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the row needs. */
export interface CommentActionsProps {
  address: ChapterAddress;
  comment: ChapterComment;
  /** Null on a reply (no replies to replies); otherwise opens the reply box. */
  onReply: (() => void) | null;
  /** What comes first in the row (the reactions, S1-E6-02). */
  before?: ReactNode;
}

/**
 * "Delete this comment?" with the two answers, in place of the row.
 *
 * @returns the question
 */
function DeleteQuestion(props: { onDelete: () => void; onKeep: () => void; isBusy: boolean }) {
  const { t } = useCommentsTranslation();
  return (
    <div
      role="group"
      aria-label={t('comment.deleteConfirm')}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-sm font-semibold text-ink">{t('comment.deleteConfirm')}</span>
      <Button variant="destructive" disabled={props.isBusy} onClick={props.onDelete}>
        {t('comment.deleteYes')}
      </Button>
      <Button variant="secondary" onClick={props.onKeep}>
        {t('comment.keep')}
      </Button>
    </div>
  );
}

/**
 * Delete, then "Delete this comment?" in its place, and a failure beside it.
 *
 * @returns the delete control for the author or the story's writer
 */
function DeleteControl({ address, comment }: { address: ChapterAddress; comment: ChapterComment }) {
  const { t } = useCommentsTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const deleting = useDeleteComment(address);
  const name = comment.author.displayName;
  return (
    <>
      {!isAsking && (
        <Button variant="text" className="px-3 text-meta" onClick={() => setIsAsking(true)}>
          {t('comment.delete')}
          <span className="sr-only"> {t('comment.reportLabel', { name })}</span>
        </Button>
      )}
      {isAsking && (
        <DeleteQuestion
          isBusy={deleting.isDeleting}
          onKeep={() => setIsAsking(false)}
          onDelete={() => void deleting.remove(comment.id).catch(errorShownByHook)}
        />
      )}
      {deleting.failure !== null && (
        <span role="alert" className="text-sm text-destructive">
          {t(`failures.${deleting.failure.failure}`)}
        </span>
      )}
    </>
  );
}

/**
 * Which actions the row offers this reader.
 *
 * @param comment - the comment
 * @param isSignedIn - whether the reader is signed in
 * @param canHaveReplies - false on a reply (replies go one level deep)
 * @returns mayReply, mayDownvote and mayReport
 */
function whatTheReaderMayDo(comment: ChapterComment, isSignedIn: boolean, canHaveReplies: boolean) {
  // A live comment, or the author's own hidden one, still has its actions.
  const isLive = comment.state === 'live' || comment.state === 'hidden';
  return {
    mayReply: canHaveReplies && isLive,
    // Downvotes are for signed-in readers, on someone else's comment that is up (S1-E6-04).
    mayDownvote: isSignedIn && !comment.isMine && comment.state === 'live',
    mayReport: !comment.isMine && isLive,
  };
}

/**
 * Reply, with the author's name for screen readers.
 *
 * @returns the button
 */
function ReplyButton({ name, onReply }: { name: string; onReply: () => void }) {
  const { t } = useCommentsTranslation();
  return (
    <Button
      variant="text"
      className="px-3 font-semibold text-heading no-underline"
      onClick={onReply}
    >
      {t('comment.reply')}
      <span className="sr-only"> {name}</span>
    </Button>
  );
}

/**
 * Renders the row.
 *
 * @returns the actions this reader may take
 */
export function CommentActions({ address, comment, onReply, before }: CommentActionsProps) {
  const { t } = useCommentsTranslation();
  const { userId } = useSession();
  const name = comment.author.displayName;
  const { mayReply, mayDownvote, mayReport } = whatTheReaderMayDo(
    comment,
    userId !== null,
    onReply !== null,
  );
  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {before}
        {mayReply && onReply !== null && <ReplyButton name={name} onReply={onReply} />}
        {mayDownvote && <DownvoteButton address={address} comment={comment} />}
        {comment.canDelete && <DeleteControl address={address} comment={comment} />}
        {mayReport && (
          <span className="ml-auto">
            <ReportButton
              itemType="comment"
              itemReference={comment.id}
              itemLabel={t('comment.reportLabel', { name })}
            />
          </span>
        )}
      </div>
      {mayDownvote && comment.isDownvotedByMe && (
        <p className="m-0 text-[13px] text-body">{t('downvote.sent')}</p>
      )}
    </div>
  );
}
