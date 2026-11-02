/**
 * SpaceAddModerator: "Add a moderator": a member's username, the powers to give them and "Make
 * moderator" (bundle FORUMS-2, part b; S1-E8-07 criterion 1: "the owner adds moderators by
 * username").
 *
 * Only a member of the space, in its age group, can be made a moderator; the database says why
 * not otherwise, and SpaceModeratorsCard shows its words. The form empties once it worked.
 * Who shows it: SpaceModeratorsCard, which sends the change (set_space_moderator()).
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { SpacePower } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpacePowerChoices } from './SpacePowerChoices';

/** What the form needs. */
interface SpaceAddModeratorProps {
  /** Sends the change; resolves to true when it worked. */
  onAdd: (handle: string, name: string, powers: SpacePower[]) => Promise<boolean>;
  isRunning: boolean;
}

/** A new moderator starts with the posts power ticked, the job most spaces need first. */
const startingPowers: SpacePower[] = ['posts'];

/**
 * Renders the form.
 *
 * @returns the form with its heading
 */
export function SpaceAddModerator({ onAdd, isRunning }: SpaceAddModeratorProps) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const [handle, setHandle] = useState('');
  const [powers, setPowers] = useState<SpacePower[]>(startingPowers);
  const cleanHandle = handle.trim().replace(/^@/, '');

  /** Sends the form, then empties it when it worked. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cleanHandle === '' || powers.length === 0) return;
    const worked = await onAdd(cleanHandle, `@${cleanHandle}`, powers);
    if (!worked) return;
    setHandle('');
    setPowers(startingPowers);
  }

  return (
    <form
      aria-labelledby={`${fieldId}-heading`}
      className="flex flex-col gap-4 border-t border-border pt-5"
      onSubmit={(event) => void submit(event)}
    >
      <h3 id={`${fieldId}-heading`} className="m-0 font-heading text-xl font-bold text-heading">
        {t('moderators.addTitle')}
      </h3>
      <TextInput
        id={fieldId}
        label={t('moderators.username')}
        hint={t('moderators.usernameHint')}
        value={handle}
        maxLength={40}
        autoComplete="off"
        onChange={(event) => setHandle(event.target.value)}
      />
      <SpacePowerChoices
        legend={t('moderators.powersLegend')}
        value={powers}
        onChange={setPowers}
      />
      <div>
        <Button type="submit" disabled={isRunning || cleanHandle === '' || powers.length === 0}>
          {t('moderators.add')}
        </Button>
      </div>
    </form>
  );
}
