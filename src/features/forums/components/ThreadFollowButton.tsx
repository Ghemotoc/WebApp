/**
 * ThreadFollowButton: "Follow thread" in the thread's side column (bundle GAPS-16, part a; story
 * S1-E8-02; board 5.2).
 *
 * A grey glass button that switches: "Follow thread" before, a tick and "Following" after, with
 * aria-pressed so the state is never shown by its words or colour alone. A line under it says
 * what following does. Shown only to a signed-in reader; a failure says so in plain words.
 * Who uses it: ThreadSidePanel. What it calls: useThreadFollow → follow_forum_thread().
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';

import { useThreadFollow } from '../hooks/useThreadFollow';
import { useForumsTranslation } from '../registerForumsTranslations';

/** The thread the button follows. */
export interface ThreadFollowButtonProps {
  threadNumber: number;
  isFollowing: boolean;
}

/**
 * Renders the button and its hint, or nothing for a visitor.
 *
 * @returns the button, the hint and any failure
 */
export function ThreadFollowButton({ threadNumber, isFollowing }: ThreadFollowButtonProps) {
  const { t } = useForumsTranslation();
  const { userId } = useSession();
  const following = useThreadFollow();
  if (userId === null) return null;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        aria-pressed={isFollowing}
        disabled={following.isRunning}
        onClick={() => following.run({ threadNumber, wanted: !isFollowing })}
      >
        {isFollowing && <CheckIcon />}
        {t(isFollowing ? 'thread.follow.following' : 'thread.follow.follow')}
      </Button>
      <p className="m-0 text-sm text-body">
        {t(isFollowing ? 'thread.follow.hintOn' : 'thread.follow.hintOff')}
      </p>
      {following.failed && (
        <p role="alert" className="m-0 text-sm font-semibold text-destructive">
          {t('thread.follow.failed')}
        </p>
      )}
    </div>
  );
}
