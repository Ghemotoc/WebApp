/**
 * RaiseRatingForm: the yellow button's one question, "What does the picture show?" (bundle
 * ADMIN-2, part e1b; Robert's brief of 2 Nov 2026, section 3, and 08:48: 16+ allows fully clothed
 * erotic imagery, 18+ nudity and sexual content of adults).
 *
 * "Nudity, erotic or explicit drawn content of adults" raises the story to 18+; "Suggestive, no
 * nudity" to at least 16+. The rating only goes up. The writer gets a statement of reasons, in
 * their language, with the message below (admin-editable interface text).
 * Who shows it: PictureDecisionButtons. What it calls: onDecide (usePicturesToCheck).
 */
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { PictureDecision, PictureToCheck } from '../api/picturesToCheck';
import type { RaiseChoice } from '../lib/pictureRaiseOptions';

/** What the form needs. */
export interface RaiseRatingFormProps {
  picture: PictureToCheck;
  /** The ratings the rules allow for this picture, highest first. */
  options: RaiseChoice[];
  isDeciding: boolean;
  onDecide: (decision: PictureDecision) => void;
  onCancel: () => void;
}

/**
 * Renders the question and the two buttons.
 *
 * @returns the form
 */
export function RaiseRatingForm(props: RaiseRatingFormProps) {
  const { t, i18n } = useTranslation('moderation');
  const groupName = useId();
  const [choice, setChoice] = useState<RaiseChoice>(props.options[0] ?? '16_plus');
  /** Sends the decision, with the writer's message in the uploader's language. */
  function submit(event: FormEvent) {
    event.preventDefault();
    const inWriterLanguage = i18n.getFixedT(props.picture.uploaderLocale, 'moderation');
    props.onDecide({
      kind: 'approve',
      caseId: props.picture.caseId,
      note: inWriterLanguage('pictures.raiseMessage', {
        rating: inWriterLanguage(`pictures.ratings.${choice}`),
      }),
      newRating: choice,
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[12px] border border-border p-4">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 font-semibold text-heading">{t('pictures.raiseQuestion')}</legend>
        {props.options.map((option) => (
          <label key={option} className="flex min-h-11 items-center gap-3 text-body">
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={choice === option}
              onChange={() => setChoice(option)}
              className="size-5"
            />
            {t(`pictures.raiseChoices.${option}`)}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={props.isDeciding}>
          {t('pictures.raiseSubmit')}
        </Button>
        <Button variant="secondary" onClick={props.onCancel}>
          {t('pictures.cancel')}
        </Button>
      </div>
    </form>
  );
}
