/**
 * SpaceSettingsPage: "Space settings", at /spaces/:spaceSlug/settings (bundle FORUMS-2, part a;
 * story S1-E8-06: the owner can change the name, rules and banner and who can post or join).
 *
 * Who shows it: the router; "Space settings" on the space's header links here, for its owner.
 * What it shows: the same form as a new space, filled in, and "Your changes are saved." after
 * saving. Anyone but the owner is told only the owner can change it; the database checks again
 * (owned_space_for_change()). A new name keeps the space's address, so links to it still work.
 * What it calls: useSpace → space_page(); useUpdateSpace → update_space().
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space, SpaceSettings } from '../api/spaces';
import { useSpace, useUpdateSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceForm } from './SpaceForm';
import { SpaceFormCard } from './SpaceFormCard';
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
          {space.viewer.canManage ? (
            <SettingsForm key={space.slug} space={space} />
          ) : (
            <Notice tone="info">{t('form.notOwner')}</Notice>
          )}
        </>
      )}
    </PageContainer>
  );
}
