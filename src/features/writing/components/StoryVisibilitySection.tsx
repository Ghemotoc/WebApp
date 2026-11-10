/**
 * StoryVisibilitySection: "Who can read it" in story settings (bundle NEW-1, part a; Robert,
 * 2 Nov 2026, 21:51 to 21:54).
 *
 * Three chips, Public, Unlisted and Private, with a line under them saying what the choice means
 * now. Unlisted works like an unlisted video: only people with the link read it, and it is in no
 * list. Private: only the writer. The database enforces it on every path
 * (story_visibility_allows(), story_listing_allows()); staff Restrict and Hide still win.
 * Class-only sharing stays on the class's own setting; "In the app only" is its own section
 * beside this one (StoryReadOnSection, GAPS-15).
 * Who uses it: StorySettingsPage (a new story starts public).
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { storyVisibilities } from '@/schemas/story';

import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryVisibilitySectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryVisibilitySection({ answers, set }: StoryVisibilitySectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection legend={t('visibility.heading')}>
      <ChoiceChips
        label={t('visibility.label')}
        options={storyVisibilities.map((visibility) => ({
          value: visibility,
          label: t(`visibility.options.${visibility}`),
        }))}
        value={answers.visibility}
        onChange={(value) =>
          // Only a value from the list can come back; anything else keeps the current choice.
          set('visibility', storyVisibilities.find((each) => each === value) ?? answers.visibility)
        }
        descriptionId="story-visibility-hint"
        description={t(`visibility.hints.${answers.visibility}`)}
      />
    </FormSection>
  );
}
