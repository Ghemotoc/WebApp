/**
 * SpaceModeratorsCard: "Moderators" on the space's settings: the owner adds a member as a
 * moderator by username, chooses their powers, changes them and takes them away (bundle
 * FORUMS-2, part b; S1-E8-07 criterion 1; the board's Moderators list and field).
 *
 * The answer ("Ana is now a moderator.") is said in a polite live region. Only the owner and our
 * moderation team see the card; the database checks again (set_space_moderator()).
 * Who shows it: SpaceSettingsPage. What it calls: useSpaceModerators → space_moderators();
 * useSetSpaceModerator → set_space_moderator(); SpaceModeratorRow and SpaceAddModerator.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { ModeratorOutcome } from '../api/spaceModeration';
import type { Space, SpacePower } from '../api/spaces';
import { useSetSpaceModerator, useSpaceModerators } from '../hooks/useSpaceModeration';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceAddModerator } from './SpaceAddModerator';
import { SpaceFormCard } from './SpaceFormCard';
import { SpaceModeratorRow } from './SpaceModeratorRow';

/** The words for each outcome. */
const outcomeKeys: Record<ModeratorOutcome, string> = {
  appointed: 'moderators.appointed',
  changed: 'moderators.changed',
  removed: 'moderators.removed',
};

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the card with the moderators and the "Add a moderator" form
 */
export function SpaceModeratorsCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const moderators = useSpaceModerators(space.slug);
  const setting = useSetSpaceModerator(space.slug);
  const [lastName, setLastName] = useState('');

  /** Sends a change and remembers whose it was, for the message. Errors show below. */
  async function change(handle: string, name: string, powers: SpacePower[]): Promise<boolean> {
    setLastName(name);
    try {
      await setting.run({ handle, powers });
      return true;
    } catch {
      return false;
    }
  }

  const list = moderators.data ?? [];
  return (
    <SpaceFormCard
      eyebrow={t('moderators.eyebrow')}
      title={t('moderators.title')}
      headingLevel="h2"
      headingId="space-moderators-heading"
    >
      <p className="m-0 text-[15px] text-body">{t('moderators.intro')}</p>
      <p aria-live="polite" className="m-0 text-sm text-body">
        {setting.outcome !== null && t(outcomeKeys[setting.outcome], { name: lastName })}
      </p>
      {setting.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(setting.failure))}</Notice>
      )}
      {moderators.isError && <Notice tone="error">{t('moderators.loadFailed')}</Notice>}
      {moderators.isSuccess && list.length === 0 && (
        <p className="m-0 text-sm text-body">{t('moderators.none')}</p>
      )}
      {list.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {list.map((moderator) => (
            <SpaceModeratorRow
              key={moderator.person?.handle ?? 'deleted'}
              moderator={moderator}
              onChange={change}
              isRunning={setting.isRunning}
            />
          ))}
        </ul>
      )}
      <SpaceAddModerator onAdd={change} isRunning={setting.isRunning} />
    </SpaceFormCard>
  );
}
