/**
 * DownvoteButton: the private Downvote in a comment's action row (story S1-E6-04; drawn as an
 * arrow-only round button on board B05-ReaderEnd, BOOKS B05, user story 2.5).
 *
 * It is a toggle (aria-pressed) named "Downvote" with the comment's author for screen readers. It
 * shows only the reader's own vote: nobody sees a count, the comment's author included (criterion
 * 1). Once pressed it fills, and CommentActions shows the board's line under the row ("Downvote
 * sent. It's private …"), so the state shows in words as well as colour; a failure shows beside it.
 * Who uses it: CommentActions, on other people's live comments for a signed-in reader.
 * What it calls: useDownvoteComment → downvote_comment().
 */
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { ChapterComment } from '../api/comments';
import { useDownvoteComment } from '../hooks/useDownvoteComment';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the button needs. */
export interface DownvoteButtonProps {
  address: ChapterAddress;
  comment: ChapterComment;
}

/**
 * Renders the button, and a failure beside it.
 *
 * @returns the button
 */
export function DownvoteButton({ address, comment }: DownvoteButtonProps) {
  const { t } = useCommentsTranslation();
  const downvote = useDownvoteComment(address, comment.id);
  const name = comment.author.displayName;
  return (
    <>
      <button
        type="button"
        aria-pressed={comment.isDownvotedByMe}
        aria-label={`${t('downvote.label')} ${t('comment.reportLabel', { name })}`}
        onClick={() => {
          // A second press while saving would race the first; it is ignored.
          if (!downvote.isSaving) downvote.setDownvoted(!comment.isDownvotedByMe);
        }}
        className={cn(
          'inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0',
          comment.isDownvotedByMe
            ? 'bg-primary text-on-primary'
            : 'bg-transparent text-ink-muted hover:bg-tint',
        )}
      >
        <ArrowDownIcon size={16} />
      </button>
      {downvote.failure !== null && (
        <span role="alert" className="type-body text-destructive">
          {t(
            `downvote.failures.${downvote.failure.failure === 'read_only' ? 'read_only' : 'other'}`,
          )}
        </span>
      )}
    </>
  );
}
