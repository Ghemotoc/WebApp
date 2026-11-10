/**
 * PictureReplaceControl: "Replace picture" on a picture inside the chapter editor (bundle GAPS-8;
 * board 4.3, "Replace picture" beside "Remove picture").
 *
 * What it does: the button opens a labelled file field under the picture. Choosing a file uploads
 * it at once, exactly as "Add a picture" does (location data removed, resized, then the picture
 * check: CLAUDE.md rule 19), and the block then shows the new picture in the same place with the
 * same alt text. A refusal says why in plain words and the old picture stays. Until the writer
 * chooses a file nothing changes, and "Cancel" closes the field.
 * Who uses it: ChapterPictureNodeView. What it calls: useChapterPictureUpload.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { pictureTypes } from '@/features/pictures/api/pictures';
import { useChapterPictureUpload } from '@/features/pictures/hooks/useChapterPictures';

import { pictureFailureMessage } from '../lib/pictureFailure';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the control needs. */
export interface PictureReplaceControlProps {
  /** The chapter's row ID: the new picture goes in its folder. */
  chapterId: string;
  /** The picture being replaced, for the field's own ID. */
  pictureId: string;
  /** Called with the new picture's ID once it is uploaded. */
  onReplaced: (pictureId: string) => void;
}

/**
 * The field's open state, the upload, and what choosing a file does.
 *
 * @returns whether the field is open, the upload, whether a picture was just replaced, and the
 *   ways to open, close and choose
 */
function usePictureReplacement({ chapterId, onReplaced }: PictureReplaceControlProps) {
  const [isOpen, setOpen] = useState(false);
  const [wasReplaced, setWasReplaced] = useState(false);
  const uploading = useChapterPictureUpload();

  /** Opens the field, forgetting what the last try said. */
  function open() {
    uploading.reset();
    setWasReplaced(false);
    setOpen(true);
  }

  /** Uploads the chosen file; the block changes only once the upload worked. */
  async function choose(file: File | null) {
    if (file === null) return;
    const uploaded = await uploading.upload({ chapterId, file }).catch(() => null);
    // A refusal stays on screen (uploading.error) with the field open, to try another file.
    if (uploaded === null) return;
    onReplaced(uploaded.pictureId);
    setWasReplaced(true);
    setOpen(false);
  }

  return { isOpen, wasReplaced, uploading, open, close: () => setOpen(false), choose };
}

/**
 * Renders the button and, once pressed, the file field.
 *
 * @returns the control
 */
export function PictureReplaceControl(props: PictureReplaceControlProps) {
  const { t } = useEditorTranslation();
  const { t: tCommon } = useTranslation();
  const { isOpen, wasReplaced, uploading, open, close, choose } = usePictureReplacement(props);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fieldId = `chapter-picture-replace-${props.pictureId}`;
  const failure = uploading.error === null ? null : pictureFailureMessage(uploading.error);

  // Once the picture is replaced the field is gone, so the focus goes back to the button that
  // opened it instead of being lost (WCAG 2.4.3).
  useEffect(() => {
    if (wasReplaced) buttonRef.current?.focus();
  }, [wasReplaced]);

  /** Closes the field and puts the focus back on the button that opened it. */
  function cancel() {
    close();
    buttonRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button ref={buttonRef} variant="secondary" aria-expanded={isOpen} onClick={open}>
          {t('picture.replace')}
        </Button>
      </div>
      {isOpen && (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
            {t('picture.replaceFileLabel')}
          </label>
          <input
            id={fieldId}
            type="file"
            accept={pictureTypes.join(',')}
            aria-describedby={`${fieldId}-hint`}
            disabled={uploading.isUploading}
            className="min-h-11 max-w-full text-sm text-body file:mr-3 file:h-11 file:rounded-full file:border file:border-control-border file:bg-surface file:px-4 file:font-semibold file:text-heading"
            onChange={(event) => void choose(event.target.files?.[0] ?? null)}
          />
          <p id={`${fieldId}-hint`} className="m-0 text-[13px] text-meta">
            {t('picture.replaceHint')}
          </p>
          <div>
            <Button variant="secondary" disabled={uploading.isUploading} onClick={cancel}>
              {t('picture.replaceCancel')}
            </Button>
          </div>
        </div>
      )}
      <div aria-live="polite">
        {uploading.isUploading && (
          <p className="m-0 text-sm text-body">{t('pictureDialog.uploading')}</p>
        )}
        {wasReplaced && <p className="m-0 text-sm text-body">{t('picture.replaced')}</p>}
        {isOpen && failure !== null && (
          <Notice tone="error">{tCommon(failure.key, failure.values)}</Notice>
        )}
      </div>
    </div>
  );
}
