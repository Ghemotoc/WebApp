/**
 * SignaturePictureControls: the signature's one still picture in Settings (story S1-E8-08
 * criterion 1: "one static image"; animated images are refused).
 *
 * The person chooses a JPEG, PNG or WebP of 1 MB or less. A moving PNG or WebP is refused in
 * words before anything is sent; the rest is redrawn as a still (location data out, made small),
 * uploaded and checked (CLAUDE.md rule 19). The small preview says where the check is; others see
 * the picture only once it passed. "Remove picture" takes it off and deletes its file.
 * Shown only while picture uploads are on (the picture_uploads switch).
 * Who uses it: SignatureSettingsSection. What it calls: useSignatureChange (upload and save),
 * useSignaturePictureView, PictureUploadField and uploadOutcomeOf from the pictures feature.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import { uploadOutcomeOf } from '@/features/pictures/hooks/usePictureUpload';

import type { MySignature } from '../api/forumSignatures';
import {
  signatureFailureOf,
  useSignatureChange,
  useSignaturePictureView,
} from '../hooks/useForumSignatures';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * The current picture and the line saying where its check is.
 *
 * @returns the preview, or nothing when there is no picture
 */
function PicturePreview({ mine }: { mine: MySignature }) {
  const { t } = useForumsTranslation();
  const picture = mine.signature?.picture ?? null;
  const view = useSignaturePictureView(picture).data ?? null;
  if (picture === null) return null;
  return (
    <div className="flex items-center gap-3">
      {view?.url != null && (
        <img
          src={view.url}
          alt={t('signature.previewAlt')}
          className="size-14 shrink-0 rounded-xl border border-border object-cover"
        />
      )}
      <Notice tone={picture.state === 'visible' ? 'success' : 'info'}>
        {t(`signature.pictureState.${picture.state}`)}
      </Notice>
    </div>
  );
}

/**
 * Renders the controls.
 *
 * @param props.mine - the person's signature, its picture's ID and any request
 * @returns the preview, the upload field and Remove picture; nothing while uploads are off
 */
export function SignaturePictureControls({ mine }: { mine: MySignature }) {
  const { t } = useForumsTranslation();
  const { isOn } = useFeatureFlags();
  const { save, upload } = useSignatureChange();
  if (!isOn('picture_uploads', false)) return null;
  const text = mine.signature?.text ?? '';
  const removeFailed =
    save.variables?.pictureId === null && signatureFailureOf(save.error) !== null;
  return (
    <div className="flex flex-col gap-3">
      <PicturePreview mine={mine} />
      <PictureUploadField
        label={t('signature.pictureLabel')}
        hint={t('signature.pictureHint')}
        isUploading={upload.isPending}
        outcome={uploadOutcomeOf(upload.data, upload.error)}
        onPick={(file) => upload.mutate({ text, file })}
      />
      {mine.pictureId !== null && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={save.isPending}
          onClick={() => save.mutate({ text, pictureId: null })}
        >
          {t('signature.removePicture')}
        </Button>
      )}
      <div aria-live="polite">
        {removeFailed && <Notice tone="error">{t('signature.removePictureFailed')}</Notice>}
      </div>
    </div>
  );
}
