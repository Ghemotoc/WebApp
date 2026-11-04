/**
 * RatingReasons: "Why is it 16+?" under the rating chips (bundle SPONSORS-f; stories S1-E3-06 and
 * S1-E12-04).
 *
 * Shown only for 16+ and 18+. One tick box per reason; the writer ticks everything that applies
 * and at least one is required. Moderators see them too, and a story with sexual content, nudity
 * or graphic violence ticked never shows a network ad on its pages (Robert, 2 Nov 2026; network_ads_barred() in the database). Our own ads and
 * sponsors are not affected.
 * Who shows it: StoryLabelsSection. What it calls: LabelCheckbox.
 */
import { useTranslation } from 'react-i18next';

import { ratingsWithReasons, storyRatingReasons, type StoryRatingReason } from '@/schemas/story';

import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from '../hooks/storyAnswers';

import { LabelCheckbox } from './LabelCheckbox';

/** What the list needs. */
export interface RatingReasonsProps {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  set: SetStoryAnswer;
}

/**
 * Adds or removes one reason, keeping the list's own order so saves compare cleanly.
 *
 * @param chosen - the reasons ticked now
 * @param reason - the one that changed
 * @param isChecked - whether it is now ticked
 * @returns the new list
 */
function toggledReasons(
  chosen: StoryRatingReason[],
  reason: StoryRatingReason,
  isChecked: boolean,
): StoryRatingReason[] {
  return storyRatingReasons.filter((each) => (each === reason ? isChecked : chosen.includes(each)));
}

/**
 * Renders the tick boxes, or nothing below 16+.
 *
 * @returns the fieldset or null
 */
export function RatingReasons({ answers, errors, set }: RatingReasonsProps) {
  const { t } = useTranslation('writing');
  const rating = answers.rating;
  // Below 16+ there is nothing to explain; the database keeps no reasons either.
  if (rating === null || !ratingsWithReasons.includes(rating)) return null;
  const hasError = errors.ratingReasons !== undefined;
  return (
    <fieldset
      className="m-0 flex flex-col gap-3 border-0 p-0"
      aria-describedby="story-rating-reasons-hint"
    >
      <legend className="mb-1 p-0 font-semibold text-heading">
        {t('labels.reasons', { rating: t(`rating.${rating}`) })} {t('labels.required')}
      </legend>
      <p
        id="story-rating-reasons-hint"
        className={hasError ? 'm-0 text-sm text-destructive' : 'm-0 text-sm text-body'}
      >
        {hasError ? t(errors.ratingReasons ?? '') : t('labels.reasonsHint')}
      </p>
      {storyRatingReasons.map((reason) => (
        <LabelCheckbox
          key={reason}
          id={`story-rating-reason-${reason}`}
          label={t(`labels.reasonNames.${reason}`)}
          isChecked={answers.ratingReasons.includes(reason)}
          onChange={(isChecked) =>
            set('ratingReasons', toggledReasons(answers.ratingReasons, reason, isChecked))
          }
        />
      ))}
    </fieldset>
  );
}
