/**
 * CommentActions: the row under a comment: Reply, Delete and Report (story S1-E6-01; board 3.5).
 *
 * - Reply (top-level comments only: replies go one level deep) opens the reply box.
 * - Delete, for the author and for the story's writer (criterion 3), asks "Delete this comment?"
 *   in place before it deletes.
 * - Report is the shared ReportButton (S1-E10-01; CLAUDE.md rule 6, DSA art. 16), on everyone
 *   else's comments, pushed to the right as on the board.
 * S1-E6-02 adds the reactions at the start of the row (the `before` slot).
 * Who uses it: CommentItem. What it calls: useDeleteComment → delete_comment(); ReportButton.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChapterComment } from '../api/comments';
import { useDeleteComment } from '../hooks/useCommentActions';
import { useCommentsTranslation } from '../registerCommentsTranslations';

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
 * Renders the row.
 *
 * @returns the actions this reader may take
 */
export function CommentActions({ address, comment, onReply, before }: CommentActionsProps) {
  const { t } = useCommentsTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const deleting = useDeleteComment(address);
  const name = comment.author.displayName;
  const isLive = comment.state === 'live' || comment.state === 'hidden';
  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {before}
        {onReply !== null && isLive && (
          <Button
            variant="text"
            className="px-3 font-semibold text-heading no-underline"
            onClick={onReply}
          >
            {t('comment.reply')}
            <span className="sr-only"> {name}</span>
          </Button>
        )}
        {comment.canDelete && !isAsking && (
          <Button variant="text" className="px-3 text-meta" onClick={() => setIsAsking(true)}>
            {t('comment.delete')}
            <span className="sr-only"> {t('comment.reportLabel', { name })}</span>
          </Button>
        )}
        {isAsking && (
          <DeleteQuestion
            isBusy={deleting.isDeleting}
            onKeep={() => setIsAsking(false)}
            onDelete={() => void deleting.remove(comment.id).catch(() => undefined)}
          />
        )}
        {!comment.isMine && isLive && (
          <span className="ml-auto">
            <ReportButton
              itemType="comment"
              itemReference={comment.id}
              itemLabel={t('comment.reportLabel', { name })}
            />
          </span>
        )}
      </div>
      {deleting.failure !== null && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(`failures.${deleting.failure.failure}`)}
        </p>
      )}
    </div>
  );
}
