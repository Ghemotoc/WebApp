/**
 * SpaceRowJoinButton: "Join", "Ask to join" or "Asked" at the end of a row under "More spaces"
 * (bundle BOOKS-7, board F06, user story 7.6).
 *
 * The story: "Join adds the member at once (spaces that take anyone); Ask to join sends a request
 * the owner or a moderator approves, and the button reads Asked until then." Pressing "Asked"
 * takes the request back, as "Take back request" does on the space's own page; the button says
 * so to screen readers and is drawn pressed (aria-pressed). The note a request can carry
 * (IDEAS-3d) is written on the space's page; from the list the request goes without one.
 * Signed out, or for a space the member can't join (another age group, a read-only account), the
 * row shows no button: the space's page says why.
 * Who shows it: SpaceRow. What it calls: useMembership → join_space(), leave_space().
 */
import { Button } from '@/components/ui/Button';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { Space } from '../api/spaces';
import { useMembership } from '../hooks/useSpaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the button and, when the change was refused, why.
 *
 * @param props.space - the space in the row
 * @returns the button, or nothing when the member can't join
 */
export function SpaceRowJoinButton({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const membership = useMembership(space.slug);
  const isAsked = space.viewer.membership === 'pending';
  // Step 1: nothing to offer when the member can't join and has no request waiting.
  if (!isAsked && !space.viewer.canJoin) return null;
  // Step 2: the words: Asked while a request waits, else Join or Ask to join.
  let label = t('list.join');
  let accessibleName = t('list.joinLabel', { name: space.name });
  if (isAsked) {
    label = t('list.asked');
    accessibleName = t('list.askedLabel', { name: space.name });
  } else if (space.joining === 'approve') {
    label = t('list.ask');
    accessibleName = t('list.askLabel', { name: space.name });
  }
  // Step 3: pressing it joins or asks, or takes a waiting request back.
  const change = isAsked ? membership.leave : () => membership.join();
  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <Button
        variant="secondary"
        aria-label={accessibleName}
        aria-pressed={isAsked ? true : undefined}
        disabled={membership.isRunning}
        onClick={() => void change().catch(errorShownByHook)}
      >
        {label}
      </Button>
      {membership.failure !== null && (
        <p role="alert" className="m-0 type-meta text-destructive">
          {t(...spaceFailureText(membership.failure))}
        </p>
      )}
    </div>
  );
}
