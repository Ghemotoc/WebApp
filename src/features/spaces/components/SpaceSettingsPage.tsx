/**
 * SpaceSettingsPage: "Space settings", at /spaces/:spaceSlug/settings (bundle FORUMS-2, part a;
 * story S1-E8-06: the owner can change the name, rules and banner and who can post or join).
 *
 * Who shows it: the router; "Space settings" on the space's header links here, for its owner.
 * What it shows: the same form as a new space, filled in, and "Your changes are saved." after
 * saving, for anyone holding the settings power (the owner, a moderator given it, or our
 * moderation team; part b, S1-E8-07), then the Banner picture card (part c) for the same people
 * while picture uploads are on. Under them, the Moderators card for the owner and our
 * moderation team (SpaceModeratorsCard). In a class space (bundle CLASSES, part a; S1-E8-11), the
 * class invite card for anyone holding the members power (ClassInviteCard). Part b adds, in a
 * class space, the members still waiting to read (ClassWaitingCard, same power) and the lock at the
 * end of the school year (ClassLockCard, the settings power). Anyone else is told only the owner can change it; the
 * database checks again. A new name keeps the space's address, so links to it still work.
 * What it calls: useSpace → space_page(); useUpdateSpace → update_space(); SpaceBannerPictureCard;
 * SpaceModeratorsCard; ClassInviteCard; ClassWaitingCard; ClassLockCard.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space, SpaceSettings } from '../api/spaces';
import { useSpace, useUpdateSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassInviteCard } from './ClassInviteCard';
import { ClassLockCard } from './ClassLockCard';
import { ClassWaitingCard } from './ClassWaitingCard';
import { SpaceBannerPictureCard } from './SpaceBannerPictureCard';
import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceForm } from './SpaceForm';
import { SpaceFormCard } from './SpaceFormCard';
import { SpaceModeratorsCard } from './SpaceModeratorsCard';
import { SpaceNotFound } from './SpaceNotFound';

/**
 * A space's settings as the form holds them (the rules one a line).
 *
 * @param space - the space
 * @returns the settings
 */
function settingsOf(space: Space): SpaceSettings {
  return {
    name: space.name,
    description: space.description,
    rules: space.rules.join('\n'),
    posting: space.posting,
    joining: space.joining,
    readers: space.readers,
    banner: space.banner,
  };
}

/**
 * The form, for the space's owner.
 *
 * @param props.space - the space
 * @returns the card with the form and the saved note
 */
function SettingsForm({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const updating = useUpdateSpace(space.slug);
  const [isSaved, setIsSaved] = useState(false);

  /** Saves the settings, then says so. */
  async function save(settings: SpaceSettings) {
    setIsSaved(false);
    await updating.run(settings);
    setIsSaved(true);
  }

  return (
    <SpaceFormCard eyebrow={t('form.editEyebrow')} title={t('form.editTitle')}>
      <div aria-live="polite">{isSaved && <Notice tone="success">{t('form.saved')}</Notice>}</div>
      <SpaceForm
        initial={settingsOf(space)}
        ageGroup={space.ageGroup ?? '16_plus'}
        ownName={space.name}
        isClass={space.kind === 'class'}
        submitLabel={t('form.save')}
        onSubmit={save}
        failure={updating.failure}
        isRunning={updating.isRunning}
        cancelTo={`/spaces/${space.slug}`}
      />
    </SpaceFormCard>
  );
}

/**
 * A class space's own cards: the invite code and who is waiting (the members power) and the lock
 * (the settings power). Nothing for an open space.
 *
 * @param props.space - the space
 * @returns the cards the viewer may use
 */
function ClassCards({ space }: { space: Space }) {
  if (space.kind !== 'class') return null;
  const { canInvite, canManage } = space.viewer;
  return (
    <>
      {canInvite && <ClassInviteCard space={space} />}
      {canInvite && <ClassWaitingCard space={space} />}
      {canManage && <ClassLockCard space={space} />}
    </>
  );
}

/**
 * The class cards, the settings form and the Moderators card, each for whoever may use it.
 *
 * @param props.space - the space
 * @returns the cards, or "only the owner" for someone who may use none
 */
function SettingsCards({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { canManage, canAppoint } = space.viewer;
  const canInvite = space.kind === 'class' && space.viewer.canInvite;
  if (!canManage && !canAppoint && !canInvite) {
    return <Notice tone="info">{t('form.notOwner')}</Notice>;
  }
  return (
    <>
      <ClassCards space={space} />
      {canManage && <SettingsForm key={space.slug} space={space} />}
      {canManage && <SpaceBannerPictureCard space={space} />}
      {canAppoint && <SpaceModeratorsCard space={space} />}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the form, "only the owner" or a "not here" note
 */
export function SpaceSettingsPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  const space = read.data;
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <SpaceBreadcrumb space={space} current={t('space.settings')} />
          <SettingsCards space={space} />
        </>
      )}
    </PageContainer>
  );
}
