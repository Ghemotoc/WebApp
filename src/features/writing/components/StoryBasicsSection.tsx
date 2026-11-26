/**
 * StoryBasicsSection: "The basics": title, blurb and the language (story S1-E3-01; board
 * NewStory 4.2, section 1).
 *
 * Board values: the title field 52 px tall in Funnel Display 700 at 20 px (maxlength 120); the blurb
 * three rows with a live "n of 500 characters" counter; the language as a drop-down (board D02,
 * user story 5.2: one language per story, others come later as editions), with the hint saying
 * so. Languages staff haven't opened yet are listed but can't be picked, marked "(soon)"
 * (S1-E11-05, criterion 5; MARKETS-2c).
 * Who uses it: NewStoryPage. What it calls: useNewStoryForm's set().
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import type { StoryLanguageChoice } from '../api/stories';
import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryBasicsSectionProps {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  /** Every language; the closed ones show as coming (S1-E11-05). */
  languages: StoryLanguageChoice[];
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryBasicsSection({ answers, errors, languages, set }: StoryBasicsSectionProps) {
  const { t } = useTranslation('writing');
  /** A language's name in the locale files, or its code for one they don't name yet. */
  const languageName = (code: string) => t(`languages.${code}`, { defaultValue: code });
  return (
    <FormSection legend={t('newStory.basics')}>
      <TextInput
        id="story-title"
        label={t('newStory.title')}
        value={answers.title}
        maxLength={MAXIMUM_TITLE_LENGTH}
        autoComplete="off"
        onChange={(event) => set('title', event.target.value)}
        errorMessage={errors.title === undefined ? undefined : t(errors.title)}
        className="h-13 font-heading type-subheading font-bold"
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
      <Select
        id="story-language"
        label={t('newStory.language')}
        isLabelVisible
        placement="form"
        options={languages.map((language) => ({
          value: language.code,
          label: language.isOpen
            ? languageName(language.code)
            : t('newStory.languageComing', { language: languageName(language.code) }),
          lang: language.isOpen ? language.code : undefined,
          isDisabled: !language.isOpen,
        }))}
        value={answers.languageCode}
        onChange={(value) => set('languageCode', value)}
        descriptionId="story-language-hint"
      />
      {/* The hint, or the mistake in its place, read with the drop-down (aria-describedby). */}
      <p
        id="story-language-hint"
        className={
          errors.languageCode === undefined ? 'm-0 type-meta' : 'm-0 type-meta text-(--error-text)'
        }
      >
        {errors.languageCode === undefined ? t('newStory.languageHint') : t(errors.languageCode)}
      </p>
    </FormSection>
  );
}
