/**
 * StoryLabelsSection: "Labels" on the new story form and in story settings (story S1-E3-06;
 * board NewStory 4.2, section "Labels").
 *
 * Board values: the intro line, the Fan fiction and Parody tick boxes with their hints, the
 * Rating chips (required) with the note that changes with the choice and the four-row guide,
 * the rule line, and "Did you use AI?" (required) with its hint. Not on the board, from the
 * decisions: "Deals with abuse or coercion" and the content note, because a story with that
 * theme must be 16+ or 18+ and carry a note (17 Oct 2026, 10:36; CLAUDE.md rule 18).
 * Who uses it: NewStoryPage and StorySettingsPage. The database checks the same rules again
 * (check_story_labels(); architecture 1.1, principle 3).
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Textarea } from '@/components/ui/Textarea';
import {
  aiDisclosures,
  MAXIMUM_CONTENT_NOTE_LENGTH,
  ratingMinimumAge,
  storyRatings,
  type AiDisclosure,
  type StoryRating,
} from '@/schemas/story';

import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';
import { LabelCheckbox } from './LabelCheckbox';
import { RatingGuide } from './RatingGuide';

/** What the section needs. */
export interface StoryLabelsSectionProps {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  set: SetStoryAnswer;
}

/** The three tick boxes: fan fiction, parody, abuse or coercion. */
function LabelTicks({ answers, set }: { answers: StoryAnswers; set: SetStoryAnswer }) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-4">
      <LabelCheckbox
        id="story-fan-fiction"
        label={t('labels.fanFiction')}
        hint={t('labels.fanFictionHint')}
        isChecked={answers.isFanFiction}
        onChange={(isChecked) => set('isFanFiction', isChecked)}
      />
      <LabelCheckbox
        id="story-parody"
        label={t('labels.parody')}
        hint={t('labels.parodyHint')}
        isChecked={answers.isParody}
        onChange={(isChecked) => set('isParody', isChecked)}
      />
      <LabelCheckbox
        id="story-abuse"
        label={t('labels.abuse')}
        hint={t('labels.abuseHint')}
        isChecked={answers.dealsWithAbuseOrCoercion}
        onChange={(isChecked) => set('dealsWithAbuseOrCoercion', isChecked)}
      />
    </div>
  );
}

/** The rating chips, the note under them and the guide. */
function RatingChoice({ answers, errors, set }: StoryLabelsSectionProps) {
  const { t } = useTranslation('writing');
  const chosen = answers.rating;
  // The note follows the choice: All ages says anyone can read it; the rest say who is kept out.
  let note = t('labels.ratingNoteAllAges');
  if (chosen !== null && chosen !== 'all_ages') {
    note = t('labels.ratingNoteHidden', { age: ratingMinimumAge[chosen] });
  }
  return (
    <div className="flex flex-col gap-3">
      <ChoiceChips
        label={`${t('labels.rating')} ${t('labels.required')}`}
        isLabelVisible
        options={storyRatings.map((rating) => ({ value: rating, label: t(`rating.${rating}`) }))}
        value={chosen ?? ''}
        onChange={(value) => set('rating', value as StoryRating)}
        descriptionId="story-rating-note"
        description={
          errors.rating === undefined ? (
            note
          ) : (
            <span className="text-destructive">{t(errors.rating)}</span>
          )
        }
      />
      <RatingGuide chosen={chosen} />
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryLabelsSection({ answers, errors, set }: StoryLabelsSectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection legend={t('labels.heading')}>
      <p className="m-0 -mt-2 text-sm leading-normal text-body">{t('labels.intro')}</p>
      <LabelTicks answers={answers} set={set} />
      <Textarea
        id="story-content-note"
        label={t('labels.contentNote')}
        rows={2}
        maxLength={MAXIMUM_CONTENT_NOTE_LENGTH}
        value={answers.contentNote}
        onChange={(event) => set('contentNote', event.target.value)}
        aria-invalid={errors.contentNote === undefined ? undefined : true}
        hint={
          errors.contentNote === undefined
            ? t('labels.contentNoteHint', {
                count: answers.contentNote.length,
                max: MAXIMUM_CONTENT_NOTE_LENGTH,
              })
            : t(errors.contentNote, { max: MAXIMUM_CONTENT_NOTE_LENGTH })
        }
      />
      <RatingChoice answers={answers} errors={errors} set={set} />
      <ChoiceChips
        label={`${t('labels.ai')} ${t('labels.required')}`}
        isLabelVisible
        options={aiDisclosures.map((answer) => ({
          value: answer,
          label: t(`aiDisclosure.${answer}`),
        }))}
        value={answers.aiDisclosure ?? ''}
        onChange={(value) => set('aiDisclosure', value as AiDisclosure)}
        descriptionId="story-ai-hint"
        description={
          errors.aiDisclosure === undefined ? (
            t('labels.aiHint')
          ) : (
            <span className="text-destructive">{t(errors.aiDisclosure)}</span>
          )
        }
      />
    </FormSection>
  );
}
