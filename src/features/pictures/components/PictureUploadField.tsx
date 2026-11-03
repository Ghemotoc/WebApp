/**
 * PictureUploadField: "Choose a picture" plus what happened to the upload (story S1-E10-05).
 *
 * A real file input with a visible label (WCAG 2.2: labelled, keyboard reachable), the accepted
 * types and size, and a live message after the upload:
 * - passed: "Your picture passed the check";
 * - held: "A person on our team will look at it first";
 * - still pending (a service was down): "We'll check it as soon as we can";
 * - refused: the reason in plain words, with the minutes to wait for the hourly limit.
 * Under the hint, PictureRulesNote says which pictures are allowed (drawings and illustrations
 * only, no photos; bundle ADMIN-2, part e1), and the file input is described by both.
 * Who uses it: CoverUploadField, CharacterPictureSection,
 * SpaceBannerPictureCard and SignaturePictureControls. What it calls: PictureRulesNote; the caller
 * passes the upload outcome from usePictureUpload.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { UploadOutcome } from '../hooks/usePictureUpload';

import { PictureRulesNote } from './PictureRulesNote';

/** What the field needs. */
export interface PictureUploadFieldProps {
  label: string;
  /** For example "JPEG, PNG or WebP, up to 5 MB." */
  hint: string;
  isUploading: boolean;
  outcome: UploadOutcome | null;
  onPick: (file: File) => void;
}

/**
 * The message for an outcome.
 *
 * @returns the tone and the translation key with its values
 */
function outcomeMessage(outcome: UploadOutcome): {
  tone: 'success' | 'info' | 'error';
  key: string;
  values?: Record<string, number>;
} {
  if (outcome.kind === 'failed') {
    if (outcome.failure === 'too_many') {
      return {
        tone: 'error',
        key: 'pictures.failed.too_many',
        values: { minutes: outcome.waitMinutes ?? 60 },
      };
    }
    return { tone: 'error', key: `pictures.failed.${outcome.failure}` };
  }
  if (outcome.status === 'passed' || outcome.status === 'approved')
    return { tone: 'success', key: 'pictures.passed' };
  if (outcome.status === 'held') return { tone: 'info', key: 'pictures.held' };
  return { tone: 'info', key: 'pictures.pending' };
}

/**
 * Renders the field.
 *
 * @returns the label, the input and the message
 */
export function PictureUploadField({
  label,
  hint,
  isUploading,
  outcome,
  onPick,
}: PictureUploadFieldProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = useId();
  const rulesId = useId();
  const message = outcome === null ? null : outcomeMessage(outcome);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${hintId} ${rulesId}`}
        disabled={isUploading}
        className="min-h-11 text-sm text-body file:mr-3 file:h-11 file:rounded-full file:border file:border-control-border file:bg-surface file:px-4 file:font-semibold file:text-heading"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) onPick(file);
          // Clearing lets the same file be chosen again after a refusal.
          event.target.value = '';
        }}
      />
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {hint}
      </p>
      <PictureRulesNote id={rulesId} />
      <div aria-live="polite">
        {isUploading && <p className="m-0 text-sm text-body">{t('pictures.uploading')}</p>}
        {!isUploading && message !== null && (
          <Notice tone={message.tone}>{t(message.key, message.values)}</Notice>
        )}
      </div>
    </div>
  );
}
