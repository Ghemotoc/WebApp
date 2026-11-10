/**
 * PostVotes: the vote chip under a forum post (bundle GAPS-16, part c; stories S1-E8-02 and
 * S1-E6-04; board 5.2).
 *
 * Board values: an Upvote chip with an up arrow and the number of upvotes (a tick and the "on"
 * fill when the reader upvoted), then a round 44 px "Downvote privately" button with a down arrow
 * in the muted colour. Both say their state with aria-pressed, never by colour alone. Pressing the
 * same button again takes the vote back; pressing the other one swaps it.
 * Downvotes are private (Q22): nobody sees a number, so the line "Only moderators see downvotes."
 * shows beside the button once the reader has downvoted (the board shows it once, on the first
 * post; docs/board-fixes.md).
 * A reader who can't vote (signed out, the post's author, a locked thread) sees the upvote count
 * alone, when there is one.
 * Who uses it: PostActions. What it calls: usePostVote → vote_forum_post().
 */
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';

import type { PostVote } from '../api/forumVotes';
import type { ForumPostVotes } from '../api/forumThreads';
import { usePostVote } from '../hooks/usePostVote';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the chip needs. */
export interface PostVotesProps {
  postId: string;
  /** The post's place in the thread, for the buttons' names. */
  postNumber: number;
  votes: ForumPostVotes;
}

/**
 * The upvote count for a reader who can't vote: an arrow and the number, read as "14 upvotes".
 *
 * @param props.count - the number of upvotes
 * @returns the count, or nothing when there are none
 */
function UpvoteCount({ count }: { count: number }) {
  const { t, i18n } = useForumsTranslation();
  if (count === 0) return null;
  return (
    <span className="inline-flex h-9 items-center gap-1.5 text-sm font-semibold text-body">
      <ArrowDownIcon className="rotate-180" />
      <span aria-hidden="true">{new Intl.NumberFormat(i18n.language).format(count)}</span>
      <span className="sr-only">{t('votes.count', { count })}</span>
    </span>
  );
}

/**
 * Renders the chip and the private downvote button, or the count alone.
 *
 * @returns the vote row
 */
export function PostVotes({ postId, postNumber, votes }: PostVotesProps) {
  const { t, i18n } = useForumsTranslation();
  const voting = usePostVote();
  if (!votes.canVote) return <UpvoteCount count={votes.up} />;

  /** Presses one button: the same vote again takes it back, the other swaps it. */
  function press(vote: Exclude<PostVote, null>) {
    voting.run({ postId, vote: votes.mine === vote ? null : vote });
  }

  const isDown = votes.mine === 'down';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        isPressed={votes.mine === 'up'}
        isDisabled={voting.isRunning}
        onPressedChange={() => press('up')}
        accessibleName={t('votes.upvoteLabel', { count: votes.up, number: postNumber })}
      >
        <span className="inline-flex items-center gap-1.5">
          <ArrowDownIcon className="rotate-180" />
          {new Intl.NumberFormat(i18n.language).format(votes.up)}
        </span>
      </Chip>
      <button
        type="button"
        aria-pressed={isDown}
        aria-label={t('votes.downvoteLabel', { number: postNumber })}
        title={t('votes.downvote')}
        disabled={voting.isRunning}
        onClick={() => press('down')}
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-full border',
          isDown ? 'border-chip-on bg-chip-on text-chip-on-text' : 'button-glass text-body',
        )}
      >
        <ArrowDownIcon />
      </button>
      {isDown && <span className="text-sm text-body">{t('votes.private')}</span>}
      {voting.failed && (
        <span role="alert" className="text-sm font-semibold text-destructive">
          {t('votes.failed')}
        </span>
      )}
    </div>
  );
}
