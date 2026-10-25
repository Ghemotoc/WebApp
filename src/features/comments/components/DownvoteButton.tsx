/**
 * DownvoteButton: the private "Downvote" chip in a comment's action row (story S1-E6-04; board
 * 3.5, the Downvote chip under each comment).
 *
 * It is a switch (aria-pressed, a tick when on, never colour alone, DoD pill system). It shows
 * only the reader's own vote: nobody sees a count, the comment's author included (criterion 1).
 * Once pressed, CommentActions shows the board's line under the row ("Downvote sent. It's
 * private …"); a failure shows beside the chip.
 * Who uses it: CommentActions, on other people's live comments for a signed-in reader.
 * What it calls: useDownvoteComment → downvote_comment().
 */
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { Chip } from '@/components/ui/Chip';
import type { ChapterAddress } from '@/features/reading/api/likes';

import type { ChapterComment } from '../api/comments';
import { useDownvoteComment } from '../hooks/useDownvoteComment';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the chip needs. */
export interface DownvoteButtonProps {
  address: ChapterAddress;
  comment: ChapterComment;
}

/**
 * Renders the chip, and a failure beside it.
 *
 * @returns the chip
 */
export function DownvoteButton({ address, comment }: DownvoteButtonProps) {
  const { t } = useCommentsTranslation();
  const downvote = useDownvoteComment(address, comment.id);
  const name = comment.author.displayName;
  return (
    <>
      <Chip
        isPressed={comment.isDownvotedByMe}
        onPressedChange={(isPressed) => {
          // A second press while saving would race the first; it is ignored.
          if (!downvote.isSaving) downvote.setDownvoted(isPressed);
        }}
      >
        <ArrowDownIcon size={16} />
        {t('downvote.label')}
        <span className="sr-only"> {t('comment.reportLabel', { name })}</span>
      </Chip>
      {downvote.failure !== null && (
        <span role="alert" className="text-sm text-destructive">
          {t(
            `downvote.failures.${downvote.failure.failure === 'read_only' ? 'read_only' : 'other'}`,
          )}
        </span>
      )}
    </>
  );
}
