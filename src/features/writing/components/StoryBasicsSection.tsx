/**
 * StoryBasicsSection: "The basics": title, blurb and the language (story S1-E3-01; board
 * NewStory 4.2, section 1).
 *
 * Board values: the title field 52 px tall in Bricolage 700 at 20 px (maxlength 120); the blurb
 * three rows with a live "n of 500 characters" counter; the language as choice chips, with the
 * note that more open once we have moderators who read them (docs/board-fixes.md: the board's
 * dashed "coming" languages are not listed, because the open list comes from the markets table).
 * Who uses it: NewStoryPage. What it calls: useNewStoryForm's set().
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Doodle } from '@/components/ui/Doodle';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import type { FieldErrors, NewStoryAnswers } from '../hooks/useNewStoryForm';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryBasicsSectionProps {
  answers: NewStoryAnswers;
  errors: FieldErrors;
  languages: string[];
  set: <Field extends keyof NewStoryAnswers>(field: Field, value: NewStoryAnswers[Field]) => void;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryBasicsSection({ answers, errors, languages, set }: StoryBasicsSectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection
      legend={t('newStory.basics')}
      decoration={
        <Doodle
          name="ideas-notepad"
          kind="widget"
          on="The basics"
          hideBelow="phone"
          className="absolute -top-7 right-5 w-16 rotate-6"
        />
      }
    >
      <TextInput
        id="story-title"
        label={t('newStory.title')}
        value={answers.title}
        maxLength={MAXIMUM_TITLE_LENGTH}
        autoComplete="off"
        onChange={(event) => set('title', event.target.value)}
        errorMessage={errors.title === undefined ? undefined : t(errors.title)}
        className="h-13 font-heading text-xl font-bold"
      />
      <Textarea
        id="story-blurb"
        label={t('newStory.blurb')}
        rows={3}
        maxLength={MAXIMUM_BLURB_LENGTH}
        value={answers.blurb}
        onChange={(event) => set('blurb', event.target.value)}
        hint={t('newStory.blurbHint', {
          count: answers.blurb.length,
          max: MAXIMUM_BLURB_LENGTH,
        })}
      />
      <ChoiceChips
        label={t('newStory.language')}
        isLabelVisible
        options={languages.map((code) => ({
          value: code,
          label: t(`languages.${code}`, { defaultValue: code }),
          lang: code,
        }))}
        value={answers.languageCode}
        onChange={(value) => set('languageCode', value)}
        descriptionId="story-language-hint"
        description={
          errors.languageCode === undefined ? t('newStory.languageHint') : t(errors.languageCode)
        }
      />
    </FormSection>
  );
}
