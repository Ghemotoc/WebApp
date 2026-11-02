/**
 * SpaceModeratorRow: one moderator on the settings' Moderators card: their name, their powers as
 * checkboxes, "Save powers" and "Remove as moderator" (bundle FORUMS-2, part b; S1-E8-07
 * criterion 1).
 *
 * Unticking every power and saving does the same as "Remove as moderator": they stay a member.
 * Who shows it: SpaceModeratorsCard, which sends the change (set_space_moderator()).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { SpaceModerator } from '../api/spaceModeration';
import type { SpacePower } from '../api/spaces';
import { samePowers } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpacePowerChoices } from './SpacePowerChoices';

/** What the row needs. */
interface SpaceModeratorRowProps {
  moderator: SpaceModerator;
  /** Sends a change; resolves to true when it worked. */
  onChange: (handle: string, name: string, powers: SpacePower[]) => Promise<boolean>;
  isRunning: boolean;
}

/**
 * Renders the row.
 *
 * @returns a list item, or nothing for a deleted account (it can't be changed by name)
 */
export function SpaceModeratorRow({ moderator, onChange, isRunning }: SpaceModeratorRowProps) {
  const { t } = useSpacesTranslation();
  const [powers, setPowers] = useState(moderator.powers);
  const person = moderator.person;
  if (person === null) return null;
  const name = nameOf(person, t('row.ownerDeleted'));
  const isChanged = !samePowers(powers, moderator.powers);
  return (
    <li className="flex flex-col gap-3 rounded-[20px] border border-border p-4">
      <span className="text-base font-semibold break-words text-heading">
        {name} <span className="font-normal text-meta">@{person.handle}</span>
      </span>
      <SpacePowerChoices
        legend={t('moderators.powersOf', { name })}
        value={powers}
        onChange={setPowers}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          aria-label={t('moderators.saveLabel', { name })}
          disabled={isRunning || !isChanged}
          onClick={() => void onChange(person.handle, name, powers)}
        >
          {t('moderators.save')}
        </Button>
        <Button
          variant="secondary"
          aria-label={t('moderators.removeLabel', { name })}
          disabled={isRunning}
          onClick={() => void onChange(person.handle, name, [])}
        >
          {t('moderators.remove')}
        </Button>
      </div>
    </li>
  );
}
