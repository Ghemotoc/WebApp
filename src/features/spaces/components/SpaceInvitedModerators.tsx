/**
 * SpaceInvitedModerators: on the settings' Moderators card, the members the owner invited to help
 * run the space who haven't answered yet: their name, the powers offered and "Take the invitation
 * back" (bundle BOOKS-7, user stories 7.7 and 7.10: "they accept first").
 *
 * Who shows it: SpaceModeratorsCard, which sends the change (set_space_moderator() with no powers
 * takes an invitation back). What it calls: useSpaceMembers → space_member_list(), which carries
 * each waiting invitation's powers.
 */
import { Button } from '@/components/ui/Button';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space, SpacePower } from '../api/spaces';
import { useSpaceMembers } from '../hooks/useSpaceModeration';
import { powerKeys } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the list needs. */
export interface SpaceInvitedModeratorsProps {
  space: Space;
  /** Sends a change of powers; no powers takes the invitation back. */
  onChange: (handle: string, name: string, powers: SpacePower[]) => Promise<boolean>;
  isRunning: boolean;
}

/**
 * Renders the list.
 *
 * @returns the invited members, or nothing while nobody waits
 */
export function SpaceInvitedModerators({
  space,
  onChange,
  isRunning,
}: SpaceInvitedModeratorsProps) {
  const { t, i18n } = useSpacesTranslation();
  const members = useSpaceMembers(space.slug, space.viewer.powers.includes('members'));
  const invited = (members.data ?? []).filter((member) => member.invitedPowers !== null);
  if (invited.length === 0) return null;
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {invited.map((member) => {
        const name = nameOf(member.person, t('row.ownerDeleted'));
        const powers = listFormat.format(
          powerKeys(member.invitedPowers ?? []).map((key) => t(key)),
        );
        const handle = member.person?.handle ?? null;
        return (
          <li key={handle ?? member.joinedAt} className="flex flex-col gap-2">
            <span className="type-label font-semibold break-words text-ink-heading">{name}</span>
            <span className="type-body text-ink-muted">
              {t('moderators.invitedNote', { powers })}
            </span>
            {handle !== null && (
              <div>
                <Button
                  variant="secondary"
                  disabled={isRunning}
                  onClick={() => void onChange(handle, name, [])}
                >
                  {t('members.choices.cancelInvite')}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
