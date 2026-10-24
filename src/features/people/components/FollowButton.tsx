/**
 * FollowButton: "Follow" / "Following" for a writer, or "Follow story" / "Following story" for a
 * story (story S1-E6-05; boards 6.1 Profile and 3.4 Story).
 *
 * A toggle button: aria-pressed says whether the reader follows, and "Following" carries a tick
 * so the state never rests on colour alone (DoD pills and chips). Its accessible name names what
 * is followed ("Follow Ana Pop": the visible words, then the name for screen readers). Signed out, it is a "Log in to follow" link instead. A
 * read-only account (for example under 18 during the invited test) is told why it can't follow.
 * Nothing shows while the target can't be seen (a block, a hidden story).
 * Who uses it: ProfileHeader, the story page's writer card and StoryHeader.
 * What it calls: useFollow → follow_writer() / follow_story().
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';

import type { FollowTarget } from '../api/follows';
import { useFollow } from '../hooks/useFollow';

/** What the button needs. */
export interface FollowButtonProps {
  target: FollowTarget;
  /** The writer's name or the story's title, for the accessible name. */
  targetLabel: string;
}

/**
 * The words on the button for this kind of target and state.
 *
 * @param target - the writer or the story
 * @param isFollowing - whether the reader follows
 * @returns the translation key
 */
function buttonTextKey(target: FollowTarget, isFollowing: boolean): string {
  if (target.kind === 'story') return isFollowing ? 'follow.followingStory' : 'follow.followStory';
  return isFollowing ? 'follow.following' : 'follow.follow';
}

/**
 * Renders the button, the log-in link or nothing.
 *
 * @returns the control and, after a failed toggle, why it failed
 */
export function FollowButton({ target, targetLabel }: FollowButtonProps) {
  const { t } = useTranslation('people');
  const follow = useFollow(target);
  if (!follow.isSessionKnown || follow.state === null) return null;
  if (!follow.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center justify-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('follow.logIn')}
      </Link>
    );
  }
  const isFollowing = follow.state.following;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={isFollowing ? 'secondary' : 'primary'}
        aria-pressed={isFollowing}
        disabled={follow.isSaving}
        onClick={follow.toggle}
      >
        {isFollowing && <CheckIcon />}
        {t(buttonTextKey(target, isFollowing))}
        {/* The name says what is followed and starts with the visible words (WCAG 2.5.3). */}
        <span className="sr-only"> {targetLabel}</span>
      </Button>
      {follow.failure !== null && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(follow.failure === 'read_only' ? 'follow.readOnly' : 'follow.failed')}
        </p>
      )}
    </div>
  );
}
