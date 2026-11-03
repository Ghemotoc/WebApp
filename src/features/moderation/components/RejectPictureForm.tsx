/**
 * RejectPictureForm: the red button's form (bundle ADMIN-2, part e1b; Robert's brief of 2 Nov
 * 2026, section 3).
 *
 * A required drop-down, "What does this image show?", from the admin-editable list of forbidden
 * kinds, and a note for the team. The uploader gets the message shown under it, in their own
 * language: it is their statement of reasons (DSA art. 17), so it names the rule and links the
 * community guidelines; the notification around it says how to appeal. The message is interface
 * text that admins can change (S1-E11-18).
 * Who shows it: PictureDecisionButtons. What it calls: onDecide (usePicturesToCheck).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { brand } from '@/config/brand';

import type { PictureDecision, PictureToCheck } from '../api/picturesToCheck';

/** What the form needs. */
export interface RejectPictureFormProps {
  picture: PictureToCheck;
  reasons: string[];
  isDeciding: boolean;
  onDecide: (decision: PictureDecision) => void;
  onCancel: () => void;
}

/**
 * The message the uploader reads, in their language.
 *
 * @param picture - the picture, for the uploader's language
 * @param reason - the reason key chosen
 * @param getFixedT - i18next's getFixedT, so the text is in the uploader's language
 * @returns the message
 */
function messageFor(
  picture: PictureToCheck,
  reason: string,
  getFixedT: ReturnType<typeof useTranslation>['i18n']['getFixedT'],
): string {
  const inUploaderLanguage = getFixedT(picture.uploaderLocale, 'moderation');
  return inUploaderLanguage('pictures.rejectMessage', {
    reason: inUploaderLanguage(`pictures.reasons.${reason}`, { defaultValue: reason }),
    link: `${brand.siteUrl}/legal/guidelines`,
  });
}

/**
 * The drop-down's options: "Choose one", then each reason's label (a reason added on Staff ›
 * Settings without its label yet shows as its key).
 *
 * @param reasons - the reason keys
 * @param t - the moderation translations
 * @returns the options
 */
function reasonOptions(reasons: string[], t: TFunction<'moderation'>) {
  return [
    { value: '', label: t('pictures.rejectChoose') },
    ...reasons.map((key) => ({
      value: key,
      label: t(`pictures.reasons.${key}`, { defaultValue: key }),
    })),
  ];
}

/**
 * What the uploader will read, and the "choose a reason" message when something is missing.
 *
 * @returns the preview and the alert, each only when there is something to say
 */
function RejectFeedback(props: { message: string; language: string; isIncomplete: boolean }) {
  const { t } = useTranslation('moderation');
  return (
    <>
      {props.message !== '' && (
        <div className="flex flex-col gap-1">
          <p className="m-0 font-semibold text-heading">{t('pictures.rejectPreview')}</p>
          <p className="m-0 text-body [overflow-wrap:anywhere]" lang={props.language}>
            {props.message}
          </p>
        </div>
      )}
      {props.isIncomplete && (
        <p role="alert" className="m-0 text-sm text-(--error-text)">
          {t('pictures.rejectIncomplete')}
        </p>
      )}
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function RejectPictureForm(props: RejectPictureFormProps) {
  const { t, i18n } = useTranslation('moderation');
  const { picture } = props;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isIncomplete, setIsIncomplete] = useState(false);
  const message = reason === '' ? '' : messageFor(picture, reason, i18n.getFixedT);
  /** Sends the decision once a reason and a note are there. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (reason === '' || note.trim() === '') {
      setIsIncomplete(true);
      return;
    }
    props.onDecide({ kind: 'reject', caseId: picture.caseId, reason, message, note: note.trim() });
  }
  const idPrefix = `reject-${picture.caseId}`;
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3 rounded-[12px] border border-border p-4"
    >
      <Select
        id={`${idPrefix}-reason`}
        label={t('pictures.rejectQuestion')}
        isLabelVisible
        placement="form"
        value={reason}
        onChange={setReason}
        options={reasonOptions(props.reasons, t)}
      />
      <Textarea
        id={`${idPrefix}-note`}
        label={t('pictures.rejectNote')}
        hint={t('pictures.rejectNoteHint')}
        value={note}
        required
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
      />
      <RejectFeedback
        message={message}
        language={picture.uploaderLocale}
        isIncomplete={isIncomplete}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={props.isDeciding}>
          {t('pictures.rejectSubmit')}
        </Button>
        <Button variant="secondary" onClick={props.onCancel}>
          {t('pictures.cancel')}
        </Button>
      </div>
    </form>
  );
}
