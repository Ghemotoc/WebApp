/**
 * SpaceJoinActions: "Join space", "Request sent" with "Take back request", or "Leave space", and
 * the line under it that says what happens (bundle FORUMS-2, part a; S1-E8-06 criteria 3 and 4;
 * the board's header buttons and {{joinNote}}).
 *
 * What the reader sees depends on the database's answer (space_viewer_json()): signed out, a
 * link to log in; the owner, "You run this space"; a member, "Leave space"; a pending request,
 * "Take back request"; someone who may join, "Join space" with how joining works here; anyone
 * else, why they can't join. The note is a polite live region, so a screen reader hears the
 * change after a click.
 * Who shows it: SpaceHeaderCard. What it calls: useMembership → join_space(), leave_space().
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space } from '../api/spaces';
import { useMembership } from '../hooks/useSpaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * The line under the buttons, for a signed-in reader.
 *
 * @param space - the space
 * @returns the translation key under "join"
 */
function noteKeyFor(space: Space): string {
  const viewer = space.viewer;
  if (viewer.membership === 'owner') return 'join.noteOwner';
  if (viewer.membership === 'member') return 'join.noteMember';
  if (viewer.membership === 'pending') return 'join.notePending';
  if (viewer.canJoin) return space.joining === 'open' ? 'join.noteOpen' : 'join.noteApprove';
  // The age group is left out for readers outside it, so a missing one means another group.
  if (space.ageGroup === null) return 'join.noteOtherGroup';
  return 'join.noteNotActive';
}

/**
 * The one button that fits the reader's membership.
 *
 * @returns Join, Take back request, Leave, or nothing (the owner, or someone who can't join)
 */
function MembershipButton({
  space,
  membership,
}: {
  space: Space;
  membership: ReturnType<typeof useMembership>;
}) {
  const { t } = useSpacesTranslation();
  const viewer = space.viewer;
  if (viewer.membership === 'member' || viewer.membership === 'pending') {
    const label = viewer.membership === 'member' ? t('join.leave') : t('join.cancelRequest');
    return (
      <Button
        variant="secondary"
        onClick={() => void membership.leave().catch(() => undefined)}
        disabled={membership.isRunning}
      >
        {label}
      </Button>
    );
  }
  if (!viewer.canJoin) return null;
  return (
    <Button
      onClick={() => void membership.join().catch(() => undefined)}
      disabled={membership.isRunning}
    >
      {t('join.join')}
    </Button>
  );
}

/**
 * Renders the buttons and the note.
 *
 * @param props.space - the space
 * @returns the actions column
 */
export function SpaceJoinActions({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { userId, isKnown } = useSession();
  const membership = useMembership(space.slug);
  if (!isKnown) return null;
  if (userId === null)
    return (
      <Link
        to="/sign-in"
        className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('join.logIn')}
      </Link>
    );
  const owner = nameOf(space.owner, t('row.ownerDeleted'));
  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <MembershipButton space={space} membership={membership} />
      <p aria-live="polite" className="m-0 text-sm text-body md:text-right">
        {t(noteKeyFor(space), { owner })}
      </p>
      {membership.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(membership.failure))}</Notice>
      )}
    </div>
  );
}
