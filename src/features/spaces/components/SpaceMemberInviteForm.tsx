/**
 * SpaceMemberInviteForm: the form under a member's row once "Make a moderator" is picked: the
 * powers to offer and "Invite as moderator" (bundle BOOKS-7, board F11, user stories 7.7 and
 * 7.10: "they accept first"). The member's powers start only once they accept on the space's page.
 *
 * Who shows it: SpaceMemberRow, for the owner. What it calls: SpacePowerChoices; the row sends
 * the invitation (set_space_moderator()).
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { useMissingField } from '@/lib/forms/useMissingField';

import type { SpacePower } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpacePowerChoices } from './SpacePowerChoices';

/** What the form needs. */
export interface SpaceMemberInviteFormProps {
  /** The member's name, for the buttons' names. */
  name: string;
  onInvite: (powers: SpacePower[]) => void;
  onCancel: () => void;
  isRunning: boolean;
}

/** A new moderator is offered the posts power first, the job most spaces need first. */
const startingPowers: SpacePower[] = ['posts'];

/**
 * Renders the form.
 *
 * @returns the powers and the two buttons, "Invite as moderator" first
 */
export function SpaceMemberInviteForm({
  name,
  onInvite,
  onCancel,
  isRunning,
}: SpaceMemberInviteFormProps) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const [powers, setPowers] = useState<SpacePower[]>(startingPowers);
  // Design books item 9: the button stays pressable and says a power is missing beside the boxes.
  const missingPowers = useMissingField(powers.length === 0, `${fieldId}-powers`);

  /** Sends the invitation, or says first that no power is ticked. */
  function invite() {
    if (!missingPowers.isReadyToSend()) return;
    onInvite(powers);
  }

  return (
    <div className="flex flex-col gap-3">
      <SpacePowerChoices
        legend={t('members.inviteLegend', { name })}
        id={`${fieldId}-powers`}
        errorMessage={missingPowers.isShown ? t('moderators.missingPowers') : undefined}
        value={powers}
        onChange={setPowers}
      />
      <ButtonRow>
        <Button
          aria-label={t('members.inviteLabel', { name })}
          disabled={isRunning}
          onClick={invite}
        >
          {t('moderators.add')}
        </Button>
        <Button variant="secondary" disabled={isRunning} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
      </ButtonRow>
    </div>
  );
}
