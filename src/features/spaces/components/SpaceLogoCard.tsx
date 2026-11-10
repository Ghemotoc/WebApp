/**
 * SpaceLogoCard: "Logo (optional)" on a space's settings (bundle G8b; story S1-E8-06; board
 * SpaceSettings: "Square, at least 512 px… Every logo is checked before it shows. No logo? The
 * space shows no picture at all.").
 *
 * Whoever holds the settings power chooses a picture; it is prepared (location data out, made
 * smaller), uploaded and checked (CLAUDE.md rule 19), and shows beside the space's name and on its
 * card once it passed. Until then the card shows a small preview and says where the check is. Any
 * picture except a real person (Robert, 7 Nov 2026; the board's "no photos" is older), so the
 * upload field's tooltip lists what is accepted, as on every other upload. "Remove" takes the logo
 * off and deletes its file. Uploads follow the picture check's switch (picture_uploads): while it
 * is off the card isn't shown.
 * Who shows it: SpaceSettingsPage. What it calls: useSpaceLogoView, useSpaceLogoChange and
 * PictureUploadField from the pictures feature.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';

import type { Space } from '../api/spaces';
import { useSpaceLogoChange, useSpaceLogoView } from '../hooks/useSpaceLogo';
import { uploadOutcomeOf } from '../lib/pictureOutcome';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/**
 * The preview and the line saying where the logo's check is.
 *
 * @param props.space - the space
 * @returns the preview and note, or "no logo" when there is none
 */
function LogoPreview({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const view = useSpaceLogoView(space).data ?? null;
  const state = space.logoPicture?.state;
  if (state === undefined) return <p className="m-0 text-sm text-body">{t('logo.none')}</p>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      {view?.url != null && (
        <img
          src={view.url}
          alt={t('logo.previewAlt')}
          className="size-24 flex-none rounded-[25px] border border-border object-cover"
        />
      )}
      <Notice tone={state === 'visible' ? 'success' : 'info'}>{t(`logo.${state}`)}</Notice>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the card, or nothing while picture uploads are off
 */
export function SpaceLogoCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { isOn } = useFeatureFlags();
  const { upload, remove } = useSpaceLogoChange(space);
  if (!isOn('picture_uploads', false)) return null;
  return (
    <SpaceFormCard
      title={t('logo.title')}
      intro={t('logo.intro')}
      headingLevel="h2"
      headingId="space-logo-heading"
    >
      <LogoPreview space={space} />
      <PictureUploadField
        label={t('logo.upload')}
        hint={t('logo.hint')}
        isUploading={upload.isPending}
        outcome={uploadOutcomeOf(upload.data, upload.error)}
        onPick={(file) => upload.mutate(file)}
      />
      {space.logoPicture !== null && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {t('logo.remove')}
        </Button>
      )}
      <div aria-live="polite">
        {remove.isError && <Notice tone="error">{t('logo.removeFailed')}</Notice>}
        {remove.isSuccess && space.logoPicture === null && (
          <p className="m-0 text-sm text-body">{t('logo.removedNotice')}</p>
        )}
      </div>
    </SpaceFormCard>
  );
}
