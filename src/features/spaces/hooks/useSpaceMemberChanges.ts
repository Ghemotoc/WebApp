/**
 * useSpaceMemberChanges: everything the members page can do to a member, "Remove", "Block",
 * "Make a moderator" and taking an invitation back, gathered in one place with the one message
 * that says what happened (bundle BOOKS-7, board F11, user stories 7.7, 7.10 and 7.11).
 *
 * Who calls it: SpaceMembersList. What it calls: useRemoveSpaceMember → remove_space_member();
 * useBlockSpaceMember → block_space_member(); useSetSpaceModerator → set_space_moderator().
 */
import { useState } from 'react';

import type { SpacePower } from '../api/spaces';
import { useBlockSpaceMember } from '../hooks/useSpaceBlocks';
import { useRemoveSpaceMember, useSetSpaceModerator } from '../hooks/useSpaceModeration';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import type { MemberActions } from '../components/SpaceMemberRow';

/**
 * Runs one change and says whether it worked; the hook that ran it keeps the failure to show.
 *
 * @param change - the change, already started
 * @returns true when it worked
 */
async function worked(change: Promise<unknown>): Promise<boolean> {
  try {
    await change;
    return true;
  } catch {
    return false;
  }
}

/**
 * The changes, the message and the failure.
 *
 * @param slug - the space's address
 * @returns actions for each row, the message after the last change, its failure and isRunning
 */
export function useSpaceMemberChanges(slug: string) {
  const { t } = useSpacesTranslation();
  const removing = useRemoveSpaceMember(slug);
  const blocking = useBlockSpaceMember(slug);
  const appointing = useSetSpaceModerator(slug);
  const [message, setMessage] = useState('');

  /** Runs a change and, when it worked, says so in the live region. */
  async function run(change: Promise<unknown>, words: string): Promise<boolean> {
    setMessage('');
    const ok = await worked(change);
    if (ok) setMessage(words);
    return ok;
  }

  const actions: MemberActions = {
    remove: (handle, name, reason) =>
      run(removing.run({ handle, reason }), t('members.removed', { name })),
    block: (handle, name, reason) =>
      run(blocking.run({ handle, reason }), t('members.blocked', { name })),
    invite: (handle: string, name: string, powers: SpacePower[]) =>
      run(appointing.run({ handle, powers }), t('moderators.invited', { name })),
    cancelInvite: (handle, name) =>
      run(appointing.run({ handle, powers: [] }), t('moderators.inviteCancelled', { name })),
  };
  return {
    actions,
    message,
    failure: removing.failure ?? blocking.failure ?? appointing.failure,
    isRunning: removing.isRunning || blocking.isRunning || appointing.isRunning,
  };
}
