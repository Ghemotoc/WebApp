/**
 * StoryBasicsSection: "The basics": title, blurb and the language (story S1-E3-01; board
 * NewStory 4.2, section 1).
 *
 * Board values: the title field 52 px tall in Funnel Display 700 at 20 px (maxlength 120); the blurb
 * three rows with a live "n of 500 characters" counter; the language as a drop-down (board D02,
 * user story 5.2: one language per story, others come later as editions), with the hint saying
 * so. Since S1-E3-01 (Robert, 26 Nov 2026) every language of the world can be picked, through
 * the searchable LanguagePicker; the "(soon)" languages of S1-E11-05 are gone.
 * Who uses it: NewStoryPage and StorySettingsPage. What it calls: LanguagePicker and
 * useNewStoryForm's set().
 */
import { useTranslation } from 'react-i18next';

import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import type { LanguageChoice } from '@/lib/language-names';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';
import { LanguagePicker } from './LanguagePicker';

/** What the section needs. */
export interface StoryBasicsSectionProps {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  /** Every language a story may be written in, named in the interface language. */
  languages: readonly LanguageChoice[];
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryBasicsSection({ answers, errors, languages, set }: StoryBasicsSectionProps) {
  const { t } = useTranslation('writing');
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
      <LanguagePicker
        id="story-language"
        label={t('newStory.language')}
        choices={languages}
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
