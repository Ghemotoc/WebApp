/**
 * SpaceMemberRow: one person on a space's members page: their picture, their name (a link to
 * their profile), a line saying their place and when they came, and "•••" with what may be done
 * to them (bundle FORUMS-2, part b; S1-E8-07: the members power; redrawn as board F11 in bundle
 * BOOKS-7, user stories 7.7, 7.10 and 7.11).
 *
 * "Remove" and "Block" first open a short form with an optional reason, so one slip of the mouse
 * removes nobody. The owner is never offered, and a moderator only to the owner and our moderation
 * team (moderators can't remove each other). "Make a moderator" is the owner's, for a member with
 * no invitation waiting; a waiting one can be taken back instead.
 * Who shows it: SpaceMembersList, which sends each change. What it calls: SpaceMemberMore,
 * SpaceMemberReasonForm and SpaceMemberInviteForm.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { SpaceMember } from '../api/spaceModeration';
import type { SpacePower } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceMemberInviteForm } from './SpaceMemberInviteForm';
import { type MemberChoice, SpaceMemberMore } from './SpaceMemberMore';
import { SpaceMemberReasonForm } from './SpaceMemberReasonForm';
import { useMemberFacts } from '../hooks/useMemberFacts';

/** What can be done to a member; each resolves to true when it worked. */
export interface MemberActions {
  remove: (handle: string, name: string, reason: string) => Promise<boolean>;
  block: (handle: string, name: string, reason: string) => Promise<boolean>;
  invite: (handle: string, name: string, powers: SpacePower[]) => Promise<boolean>;
  cancelInvite: (handle: string, name: string) => Promise<boolean>;
}

/** What the row needs. */
export interface SpaceMemberRowProps {
  member: SpaceMember;
  /** Whether the reader is the owner or our moderation team: they may act on moderators too. */
  mayAppoint: boolean;
  actions: MemberActions;
  isRunning: boolean;
}

/**
 * What the reader may do to this member, in the board's order.
 *
 * @param member - the member
 * @param mayAppoint - whether the reader may act on moderators and make new ones
 * @returns the choices' keys
 */
function choiceKeysFor(member: SpaceMember, mayAppoint: boolean): string[] {
  if (member.person === null || member.role === 'owner') return [];
  if (member.role === 'moderator' && !mayAppoint) return [];
  const keys = ['remove', 'block'];
  if (mayAppoint && member.role === 'member' && member.invitedPowers === null) keys.push('invite');
  if (mayAppoint && member.invitedPowers !== null) keys.push('cancelInvite');
  return keys;
}

/** What the picked form needs. */
interface MemberPickedFormProps {
  picked: string;
  name: string;
  actions: MemberActions;
  /** Sends a change for the member's username, then closes the form when it worked. */
  onSend: (send: (handle: string) => Promise<boolean>) => void;
  onCancel: () => void;
  isRunning: boolean;
}

/**
 * The form for what was picked: "Remove" and "Block" ask for a reason, "Make a moderator" for
 * the powers to offer.
 *
 * @returns the form, or nothing for a pick with no form
 */
function MemberPickedForm({
  picked,
  name,
  actions,
  onSend,
  onCancel,
  isRunning,
}: MemberPickedFormProps) {
  const { t } = useSpacesTranslation();
  if (picked === 'invite') {
    return (
      <SpaceMemberInviteForm
        name={name}
        onInvite={(powers) => onSend((handle) => actions.invite(handle, name, powers))}
        onCancel={onCancel}
        isRunning={isRunning}
      />
    );
  }
  const kind = picked === 'block' ? 'block' : 'remove';
  const words = {
    label: t(kind === 'block' ? 'members.blockReason' : 'members.reason', { name }),
    hint: t(kind === 'block' ? 'members.blockHint' : 'members.reasonHint'),
    confirm: t(kind === 'block' ? 'members.blockConfirm' : 'members.confirm'),
    confirmLabel: t(kind === 'block' ? 'members.blockConfirmLabel' : 'members.confirmLabel', {
      name,
    }),
  };
  return (
    <SpaceMemberReasonForm
      words={words}
      onConfirm={(reason) => onSend((handle) => actions[kind](handle, name, reason))}
      onCancel={onCancel}
      isRunning={isRunning}
    />
  );
}

/**
 * The picture, the name (a link to their profile) and the facts.
 *
 * @param props.member - the member
 * @param props.name - their name in words
 * @returns the picture and the two lines
 */
function MemberIdentity({ member, name }: { member: SpaceMember; name: string }) {
  const facts = useMemberFacts(member);
  const person = member.person;
  return (
    <>
      <PersonAvatar name={name} handle={person?.handle ?? null} size="medium" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {person === null ? (
          <span className="type-label font-semibold text-ink-heading">{name}</span>
        ) : (
          <Link
            to={`/u/${person.handle}`}
            className="type-label font-semibold break-words text-ink-heading no-underline hover:underline"
          >
            {name}
          </Link>
        )}
        <MetaLine facts={facts} />
      </div>
    </>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function SpaceMemberRow({ member, mayAppoint, actions, isRunning }: SpaceMemberRowProps) {
  const { t } = useSpacesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const person = member.person;
  const name = nameOf(person, t('row.ownerDeleted'));
  const choices: MemberChoice[] = choiceKeysFor(member, mayAppoint).map((key) => ({
    key,
    label: t(`members.choices.${key}`),
  }));

  /** Runs a change, then closes the form when it worked. */
  async function finish(change: Promise<boolean>) {
    if (await change) {
      setPicked(null);
      setIsOpen(false);
    }
  }

  /** Acts on a pick: taking back an invitation needs no form, the others open theirs. */
  function pick(key: string) {
    if (person === null) return;
    if (key === 'cancelInvite') {
      void finish(actions.cancelInvite(person.handle, name));
      return;
    }
    setPicked(key);
  }

  const handle = person === null ? '' : person.handle;
  return (
    <li className="flex flex-col gap-3 border-t border-border py-3">
      <div className="flex items-start gap-3">
        <MemberIdentity member={member} name={name} />
        {choices.length > 0 && (
          <SpaceMemberMore
            name={name}
            choices={choices}
            isOpen={isOpen}
            onToggle={() => setIsOpen((open) => !open)}
            onPick={pick}
          />
        )}
      </div>
      {picked !== null && (
        <MemberPickedForm
          picked={picked}
          name={name}
          onSend={(send) => void finish(send(handle))}
          onCancel={() => setPicked(null)}
          isRunning={isRunning}
          actions={actions}
        />
      )}
    </li>
  );
}
