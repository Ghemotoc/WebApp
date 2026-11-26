/**
 * FollowButton: "Follow" / "Following" for a writer, "Follow story" / "Following story" for a
 * story (story S1-E6-05; boards 6.1 Profile and 3.4 Story), "Follow Fantasy" for a genre (board
 * A06) and "Follow this tag" for a tag (board A09; BOOKS-A06 and BOOKS-A09).
 *
 * A toggle button: aria-pressed says whether the reader follows, and "Following" carries a tick
 * so the state never rests on colour alone (DoD pills and chips). It is always the quiet button;
 * pressed, it shows the filled look (CALM-1b, canvas v38). Its accessible name names what
 * is followed ("Follow Ana Pop": the visible words, then the name for screen readers). Signed out, it is a "Get in to follow" link instead. A
 * read-only account (for example under 18 during the invited test) is told why it can't follow.
 * Nothing shows while the target can't be seen (a block, a hidden story).
 * Unfollowing happens at once and offers "Undo" for 8 seconds in the shared undo note instead of
 * asking first (design books item 14).
 * Who uses it: ProfileHeader, the story page's writer card and StoryHeader.
 * What it calls: useFollow → follow_writer() / follow_story(), and useUndo for the note.
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { Link } from 'react-router';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { useUndo } from '@/lib/undo/useUndo';

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
 * @param target - the writer, story, genre or tag
 * @param isFollowing - whether the reader follows
 * @returns the translation key
 */
function buttonTextKey(target: FollowTarget, isFollowing: boolean): string {
  if (target.kind === 'story') return isFollowing ? 'follow.followingStory' : 'follow.followStory';
  // Board A06 names the genre on the button itself: "Follow Fantasy".
  if (target.kind === 'genre') return isFollowing ? 'follow.followingNamed' : 'follow.followNamed';
  if (target.kind === 'tag') return isFollowing ? 'follow.followingTag' : 'follow.followTag';
  return isFollowing ? 'follow.following' : 'follow.follow';
}

/**
 * Renders the button, the log-in link or nothing.
 *
 * @returns the control and, after a failed toggle, why it failed
 */
export function FollowButton({ target, targetLabel }: FollowButtonProps) {
  const { t } = usePeopleTranslation();
  const follow = useFollow(target);
  const { offerUndo } = useUndo();
  if (!follow.isSessionKnown || follow.state === null) return null;
  if (!follow.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center justify-center rounded-full button-glass px-4 type-body font-semibold no-underline"
      >
        {t('follow.logIn')}
      </Link>
    );
  }
  const isFollowing = follow.state.following;

  /** Follows, or stops following and offers Undo once the database agreed. */
  async function press() {
    if (!isFollowing) {
      follow.toggle();
      return;
    }
    try {
      await follow.setFollowing(false);
    } catch {
      // The failure note below already says what went wrong; nothing to undo.
      return;
    }
    offerUndo({
      message: t('follow.unfollowed', { name: targetLabel }),
      undo: () => follow.setFollowing(true),
    });
  }
  return (
    <div className="flex flex-col items-start gap-2">
      {/* Always the quiet button: pressed (Following) reverses it to the filled look in index.css,
          so Follow stays quiet beside a page's one main button (canvas v38; CALM-1b). */}
      <Button
        variant="secondary"
        aria-pressed={isFollowing}
        disabled={follow.isSaving}
        onClick={() => void press()}
      >
        {isFollowing && <CheckIcon />}
        {t(buttonTextKey(target, isFollowing), { name: targetLabel })}
        {/* The name says what is followed and starts with the visible words (WCAG 2.5.3); a
            genre's button already shows its name. */}
        {target.kind !== 'genre' && <span className="sr-only"> {targetLabel}</span>}
      </Button>
      {follow.failure !== null && (
        <p role="alert" className="m-0 type-body text-destructive">
          {t(follow.failure === 'read_only' ? 'follow.readOnly' : 'follow.failed')}
        </p>
      )}
    </div>
  );
}
