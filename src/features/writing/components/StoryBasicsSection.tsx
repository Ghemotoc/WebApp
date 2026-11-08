/**
 * StoryBasicsSection: "The basics": title, blurb and the language (story S1-E3-01; board
 * NewStory 4.2, section 1).
 *
 * Board values: the title field 52 px tall in Bricolage 700 at 20 px (maxlength 120); the blurb
 * three rows with a live "n of 500 characters" counter; the language as choice chips, with the
 * note that more open once we have moderators who read them. Languages staff haven't opened yet
 * show as disabled chips, "coming when we have moderators for it" (S1-E11-05, criterion 5).
 * Who uses it: NewStoryPage. What it calls: useNewStoryForm's set().
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
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
        description={
          errors.languageCode === undefined ? t('newStory.languageHint') : t(errors.languageCode)
        }
      />
    </FormSection>
  );
}
