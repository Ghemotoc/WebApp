/**
 * CertificateCrestField: the class's crest on the teacher's Certificates page (bundle G13b; the
 * canvas's SpaceCertificates board: "Upload your school's crest or logo (PNG or SVG, up to 2 MB).
 * We check every picture automatically before it shows.").
 *
 * The teacher chooses a file; an SVG is redrawn as a PNG in the browser so only its pixels are
 * kept, then it is uploaded and checked like every other picture (CLAUDE.md rule 19). A line says
 * where the check is; until the crest passed, the cat shows in the seal. "Remove the crest" takes
 * it off. Uploads follow the picture check's switch (picture_uploads): while it is off, the field
 * isn't shown and the seal keeps the cat.
 * Who shows it: CertificateSealChoices. What it calls: useClassCertificateCrest,
 * useCertificateCrestChange, PictureUploadField and uploadOutcomeOf from spaces.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import { uploadOutcomeOf } from '@/features/spaces/lib/pictureOutcome';

import { useCertificateCrestChange, useClassCertificateCrest } from '../hooks/useCertificateCrest';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** The crest files the picker offers: the board's PNG and SVG, and JPEG and WebP as well. */
const crestFileTypes = 'image/png,image/svg+xml,image/jpeg,image/webp';

/**
 * The crest's small preview and where its check is.
 *
 * @param props.slug - the class's address
 * @returns the preview and the note
 */
function CrestState({ slug }: { slug: string }) {
  const { t } = useCertificatesTranslation();
  const crest = useClassCertificateCrest(slug);
  if (crest.isPending) return null;
  const view = crest.data ?? null;
  if (view === null) return <p className="m-0 text-sm text-body">{t('look.crestStates.none')}</p>;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-dashed border-control-border p-3">
      {view.url !== null && (
        <img
          src={view.url}
          alt={t('look.crestPreviewAlt')}
          className="size-11 flex-none rounded-full border border-border bg-white object-contain"
        />
      )}
      <p className="m-0 flex-1 text-sm text-body">{t(`look.crestStates.${view.state}`)}</p>
    </div>
  );
}

/**
 * Renders the field.
 *
 * @param props.space - the class's address and ID
 * @returns the crest's state, the upload and the remove button, or nothing while uploads are off
 */
export function CertificateCrestField({ space }: { space: { slug: string; spaceId: string } }) {
  const { t } = useCertificatesTranslation();
  const { isOn } = useFeatureFlags();
  const { upload, remove } = useCertificateCrestChange(space);
  const crest = useClassCertificateCrest(space.slug);
  if (!isOn('picture_uploads', false)) return null;
  return (
    <div className="flex flex-col gap-3">
      <CrestState slug={space.slug} />
      <PictureUploadField
        label={t('look.crestUpload')}
        hint={t('look.crestHint')}
        accept={crestFileTypes}
        isUploading={upload.isPending}
        outcome={uploadOutcomeOf(upload.data, upload.error)}
        onPick={(file) => upload.mutate(file)}
      />
      {crest.data != null && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {t('look.crestRemove')}
        </Button>
      )}
      <div aria-live="polite">
        {remove.isError && <Notice tone="error">{t('look.crestRemoveFailed')}</Notice>}
      </div>
    </div>
  );
}
