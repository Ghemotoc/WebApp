/**
 * PictureFileField: the picture file in "Add a picture" (story S1-E3-09 criterion 1).
 *
 * A real, labelled file input (WCAG 2.2: labelled, keyboard reachable) that takes JPEG, PNG or
 * WebP, with the hint saying the limit and what happens to the file, and an error when the
 * writer pressed "Add the picture" without one. The file is checked again before it is sent
 * (src/features/pictures/api/pictures.ts) and by the bucket itself.
 * Who uses it: PictureInsertDialog.
 */

import { pictureTypes } from '@/features/pictures/api/pictureUploads';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the field needs. */
export interface PictureFileFieldProps {
  file: File | null;
  isDisabled: boolean;
  errorMessage?: string;
  onPick: (file: File | null) => void;
}

/**
 * Renders the field.
 *
 * @returns the label, the input, its hint and the error
 */
export function PictureFileField({
  file,
  isDisabled,
  errorMessage,
  onPick,
}: PictureFileFieldProps) {
  const { t } = useEditorTranslation();
  const describedBy =
    errorMessage === undefined
      ? 'chapter-picture-file-hint'
      : 'chapter-picture-file-hint chapter-picture-file-error';
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="chapter-picture-file" className="text-sm font-semibold text-ink">
        {t('pictureDialog.fileLabel')}
      </label>
      <input
        id="chapter-picture-file"
        type="file"
        accept={pictureTypes.join(',')}
        aria-describedby={describedBy}
        aria-invalid={errorMessage === undefined ? undefined : true}
        disabled={isDisabled}
        className="min-h-11 max-w-full text-sm text-body file:mr-3 file:h-11 file:rounded-full file:border file:border-control-border file:bg-surface file:px-4 file:font-semibold file:text-heading"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
      {file !== null && <span className="sr-only">{file.name}</span>}
      <p id="chapter-picture-file-hint" className="m-0 text-[13px] text-meta">
        {t('pictureDialog.fileHint')}
      </p>
      {errorMessage !== undefined && (
        <p id="chapter-picture-file-error" className="m-0 text-sm font-semibold text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
