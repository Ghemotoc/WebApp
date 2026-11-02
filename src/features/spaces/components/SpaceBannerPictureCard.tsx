/**
 * SpaceBannerPictureCard: "Banner picture" on a space's settings (bundle FORUMS-2, part c; story
 * S1-E8-06 criterion 1: "an optional banner"; board 5.3's banner band).
 *
 * Whoever holds the settings power chooses a picture; it is prepared (location data out, made
 * smaller), uploaded and checked (CLAUDE.md rule 19) and shows across the top of the space once it
 * passed. Until then the card shows a small preview and says where the check is, and the space
 * keeps its colour. "Use the colour instead" takes the picture off and deletes its file.
 * Uploads follow the picture check's switch (picture_uploads): while it is off the card isn't
 * shown. Who shows it: SpaceSettingsPage. What it calls: useSpaceBannerView, useSpaceBannerChange
 * and PictureUploadField from the pictures feature.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { PictureUploadError } from '@/features/pictures/api/pictures';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import type { UploadOutcome } from '@/features/pictures/hooks/usePictureUpload';

import type { Space } from '../api/spaces';
import { useSpaceBannerChange, useSpaceBannerView } from '../hooks/useSpaceBanner';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/**
 * What the upload field says, from the upload's result or error.
 *
 * @param status - the check's status after the upload, or undefined before one
 * @param error - the upload's error, or null
 * @returns the outcome, or null before any upload
 */
function outcomeOf(status: string | undefined, error: Error | null): UploadOutcome | null {
  if (error !== null) {
    if (error instanceof PictureUploadError) {
      return { kind: 'failed', failure: error.failure, waitMinutes: error.waitMinutes };
    }
    return { kind: 'failed', failure: 'unreachable', waitMinutes: null };
  }
  return status === undefined ? null : { kind: 'uploaded', path: '', status };
}

/**
 * The preview and the line saying where the picture's check is.
 *
 * @param props.space - the space
 * @returns the preview and note, or "uses its colour" when there is no picture
 */
function BannerPreview({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const view = useSpaceBannerView(space).data ?? null;
  const state = space.bannerPicture?.state;
  if (state === undefined)
    return <p className="m-0 text-sm text-body">{t('bannerPicture.none')}</p>;
  return (
    <div className="flex flex-col gap-3">
      {view?.url != null && (
        <img
          src={view.url}
          alt={t('bannerPicture.previewAlt')}
          className="h-24 w-full max-w-[480px] rounded-xl border border-border object-cover"
        />
      )}
      <Notice tone={state === 'visible' ? 'success' : 'info'}>{t(`bannerPicture.${state}`)}</Notice>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the card, or nothing while picture uploads are off
 */
export function SpaceBannerPictureCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { isOn } = useFeatureFlags();
  const { upload, remove } = useSpaceBannerChange(space);
  if (!isOn('picture_uploads', false)) return null;
  return (
    <SpaceFormCard
      eyebrow={t('bannerPicture.eyebrow')}
      title={t('bannerPicture.title')}
      intro={t('bannerPicture.intro')}
      headingLevel="h2"
      headingId="space-banner-picture-heading"
    >
      <BannerPreview space={space} />
      <PictureUploadField
        label={t('bannerPicture.upload')}
        hint={t('bannerPicture.hint')}
        isUploading={upload.isPending}
        outcome={outcomeOf(upload.data, upload.error)}
        onPick={(file) => upload.mutate(file)}
      />
      {space.bannerPicture !== null && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {t('bannerPicture.remove')}
        </Button>
      )}
      <div aria-live="polite">
        {remove.isError && <Notice tone="error">{t('bannerPicture.removeFailed')}</Notice>}
        {remove.isSuccess && space.bannerPicture === null && (
          <p className="m-0 text-sm text-body">{t('bannerPicture.removedNotice')}</p>
        )}
      </div>
    </SpaceFormCard>
  );
}
