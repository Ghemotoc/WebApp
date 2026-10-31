/**
 * PictureInsertDialog: "Add a picture", opened from Insert › Picture (story S1-E3-09
 * criterion 1; board 4.3).
 *
 * What it does: a native <dialog> (focus stays inside, Escape closes) with the picture file
 * (JPEG, PNG or WebP up to 5 MB), its alt text (required, 300 characters) and the "I have the
 * right to use this picture" box. "Add the picture" refuses until all three are there, then
 * uploads it (metadata removed and resized first, its picture check straight after) and puts it
 * in the chapter where the cursor was. A refusal says why in plain words and keeps what was
 * filled in.
 * Who uses it: ChapterInsertControls. What it calls: useChapterPictureUpload, then
 * insertChapterPicture() (lib/chapterPictureNode.ts).
 */
import type { Editor } from '@tiptap/react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { useChapterPictureUpload } from '@/features/pictures/hooks/useChapterPictures';
import { MAXIMUM_ALT_TEXT_LENGTH } from '@/lib/chapter-pictures';

import { useNativeDialog } from '../hooks/useNativeDialog';
import { insertChapterPicture } from '../lib/chapterPictureNode';
import { pictureFailureMessage } from '../lib/pictureFailure';

import { LabelCheckbox } from './LabelCheckbox';
import { PictureFileField } from './PictureFileField';

/** What the dialog needs. */
export interface PictureInsertDialogProps {
  editor: Editor;
  /** The chapter's row ID: its pictures go in its folder. */
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
}

/** What the form holds. */
interface PictureForm {
  file: File | null;
  alt: string;
  rightsConfirmed: boolean;
}

/** Which fields are missing, after the writer pressed "Add the picture". */
interface MissingFields {
  file: boolean;
  alt: boolean;
  rights: boolean;
}

/** An empty form. */
const emptyForm: PictureForm = { file: null, alt: '', rightsConfirmed: false };

/**
 * Which fields still need something.
 *
 * @returns the missing fields, or null when the form is complete
 */
function missingFieldsOf(form: PictureForm): MissingFields | null {
  const missing = {
    file: form.file === null,
    alt: form.alt.trim() === '',
    rights: !form.rightsConfirmed,
  };
  return missing.file || missing.alt || missing.rights ? missing : null;
}

/**
 * The form's state, the upload, and the two ways out: added (the picture goes in the chapter) or
 * closed. Either way the form starts empty next time.
 *
 * @returns the form, what is missing, the upload, submit(event) and close()
 */
function usePictureInsert(props: PictureInsertDialogProps) {
  const { editor, chapterId, onClose } = props;
  const [form, setForm] = useState<PictureForm>(emptyForm);
  const [missing, setMissing] = useState<MissingFields | null>(null);
  const uploading = useChapterPictureUpload();

  /** Closes and empties the form for next time. */
  function close() {
    setForm(emptyForm);
    setMissing(null);
    uploading.reset();
    onClose();
  }

  /** Add: everything must be there; then upload, insert and close. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const stillMissing = missingFieldsOf(form);
    setMissing(stillMissing);
    if (stillMissing !== null || form.file === null) return;
    const uploaded = await uploading
      .upload({ chapterId, file: form.file, rightsConfirmed: form.rightsConfirmed })
      .catch(() => null);
    // A refusal stays on screen (uploading.error); the form keeps what was filled in.
    if (uploaded === null) return;
    insertChapterPicture(editor, { pictureId: uploaded.pictureId, alt: form.alt.trim() });
    close();
  }

  return { form, setForm, missing, uploading, submit, close };
}

/** What the fields need: the form, what is missing, and whether an upload is running. */
interface PictureFieldsProps {
  form: PictureForm;
  missing: MissingFields | null;
  isUploading: boolean;
  onChange: (form: PictureForm) => void;
}

/** The file, the alt text, the rights box and the note on the picture check. */
function PictureFields({ form, missing, isUploading, onChange }: PictureFieldsProps) {
  const { t } = useTranslation('editor');
  return (
    <>
      <PictureFileField
        file={form.file}
        isDisabled={isUploading}
        errorMessage={missing?.file === true ? t('pictureDialog.missingFile') : undefined}
        onPick={(file) => onChange({ ...form, file })}
      />
      <TextInput
        id="chapter-picture-alt"
        label={t('pictureDialog.altLabel')}
        value={form.alt}
        maxLength={MAXIMUM_ALT_TEXT_LENGTH}
        required
        onChange={(event) => onChange({ ...form, alt: event.target.value })}
        hint={t('pictureDialog.altHint')}
        errorMessage={missing?.alt === true ? t('pictureDialog.missingAlt') : undefined}
      />
      <LabelCheckbox
        id="chapter-picture-rights"
        label={t('pictureDialog.rightsLabel')}
        hint={t('pictureDialog.rightsHint')}
        isChecked={form.rightsConfirmed}
        onChange={(isChecked) => onChange({ ...form, rightsConfirmed: isChecked })}
      />
      {missing?.rights === true && <Notice tone="error">{t('pictureDialog.missingRights')}</Notice>}
      <p className="m-0 text-sm text-body">{t('pictureDialog.checkNote')}</p>
    </>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when isOpen is false)
 */
export function PictureInsertDialog(props: PictureInsertDialogProps) {
  const { t } = useTranslation('editor');
  const { t: tCommon } = useTranslation();
  const { form, setForm, missing, uploading, submit, close } = usePictureInsert(props);
  const dialogRef = useNativeDialog(props.isOpen);

  const failure = uploading.error === null ? null : pictureFailureMessage(uploading.error);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chapter-picture-heading"
      onClose={close}
      className="m-auto max-h-[92vh] w-[min(92vw,480px)] overflow-y-auto rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/40"
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <h2
          id="chapter-picture-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('pictureDialog.heading')}
        </h2>
        <PictureFields
          form={form}
          missing={missing}
          isUploading={uploading.isUploading}
          onChange={setForm}
        />
        <div aria-live="polite">
          {uploading.isUploading && (
            <p className="m-0 text-sm text-body">{t('pictureDialog.uploading')}</p>
          )}
          {failure !== null && <Notice tone="error">{tCommon(failure.key, failure.values)}</Notice>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={uploading.isUploading}>
            {t('pictureDialog.add')}
          </Button>
          <Button variant="secondary" onClick={close}>
            {t('pictureDialog.cancel')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
