/**
 * SpaceMemberRow: one member on the members page: their name, their place (owner, moderator with
 * powers, member), when they joined and "Remove from space" (bundle FORUMS-2, part b; S1-E8-07:
 * the members power).
 *
 * "Remove from space" first opens a short form with an optional reason (kept in the space's log)
 * and "Yes, remove", so one slip of the mouse removes nobody. The owner is never offered, and a
 * moderator only to the owner and our moderation team (moderators can't remove each other).
 * Who shows it: SpaceMembersPage, which sends the removal (remove_space_member()).
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { threadDay } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { SpaceMember } from '../api/spaceModeration';
import { powerKeys } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the row needs. */
interface SpaceMemberRowProps {
  member: SpaceMember;
  /** Whether the reader may remove moderators too (the owner and our moderation team). */
  mayRemoveModerators: boolean;
  /** Sends the removal; resolves to true when it worked. */
  onRemove: (handle: string, name: string, reason: string) => Promise<boolean>;
  isRunning: boolean;
}

/**
 * The line under the name: "Owner", "Moderator: posts and members" or "Member".
 *
 * @returns the line's text
 */
function usePlaceText(member: SpaceMember): string {
  const { t, i18n } = useSpacesTranslation();
  if (member.role === 'owner') return t('runs.owner');
  if (member.role === 'member') return t('members.member');
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  return t('runs.moderator', {
    powers: listFormat.format(powerKeys(member.powers).map((key) => t(key))),
  });
}

/**
 * The reason field and the button that removes, once "Remove from space" is pressed.
 *
 * @returns the small form
 */
function RemoveForm({
  name,
  onConfirm,
  onCancel,
  isRunning,
}: {
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isRunning: boolean;
}) {
  const { t } = useSpacesTranslation();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        id={reasonId}
        label={t('members.reason', { name })}
        hint={t('members.reasonHint')}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          aria-label={t('members.confirmLabel', { name })}
          disabled={isRunning}
          onClick={() => onConfirm(reason)}
        >
          {t('members.confirm')}
        </Button>
        <Button variant="secondary" disabled={isRunning} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function SpaceMemberRow({
  member,
  mayRemoveModerators,
  onRemove,
  isRunning,
}: SpaceMemberRowProps) {
  const { t, i18n } = useSpacesTranslation();
  const [isRemoving, setIsRemoving] = useState(false);
  const place = usePlaceText(member);
  const person = member.person;
  const name = nameOf(person, t('row.ownerDeleted'));
  const mayRemove =
    person !== null && member.role !== 'owner' && (member.role === 'member' || mayRemoveModerators);

  /** Sends the removal; the row goes once the list reads again. */
  async function confirm(reason: string) {
    if (person === null) return;
    const worked = await onRemove(person.handle, name, reason);
    if (worked) setIsRemoving(false);
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <span className="text-base font-semibold break-words text-heading">{name}</span>
      <span className="text-sm text-body">{place}</span>
      <span className="text-[13px] text-meta">
        {t('members.joined', { date: threadDay(member.joinedAt, i18n.language) })}
      </span>
      {mayRemove && !isRemoving && (
        <div>
          <Button
            variant="secondary"
            aria-label={t('members.removeLabel', { name })}
            disabled={isRunning}
            onClick={() => setIsRemoving(true)}
          >
            {t('members.remove')}
          </Button>
        </div>
      )}
      {mayRemove && isRemoving && (
        <RemoveForm
          name={name}
          onConfirm={(reason) => void confirm(reason)}
          onCancel={() => setIsRemoving(false)}
          isRunning={isRunning}
        />
      )}
    </li>
  );
}
