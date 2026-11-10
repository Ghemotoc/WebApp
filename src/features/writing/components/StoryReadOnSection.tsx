/**
 * StoryReadOnSection: "Where can people read this story?" in story settings (bundle GAPS-15;
 * story S1-E3-08; board NewStory).
 *
 * Two chips, "On the web and in the app" (the default) and "In the app only", with a line under
 * them saying what the choice means. App only combines with Public or Unlisted (NEW-1).
 * The choice is saved straight away, but it only changes anything once the apps exist and staff
 * turn the 'app_only_stories' switch on (Q35, 16 Oct 2026, late evening). Until then the line says
 * that signed-in readers still read every chapter on the web and that writers hear before it
 * applies, so nobody is surprised (the board's note).
 * Who uses it: StorySettingsPage, under "Who can read it". What it calls: useFeatureFlags() for
 * the switch; the answer is saved by updateMyStory() through set_my_story_app_only().
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** The two chips' values: where readers can read the chapters. */
const readOnChoices = ['web_and_app', 'app_only'] as const;

/** What the section needs. */
export interface StoryReadOnSectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset with the two chips and the line that explains the choice
 */
export function StoryReadOnSection({ answers, set }: StoryReadOnSectionProps) {
  const { t } = useTranslation('writing');
  const { isOn } = useFeatureFlags();
  const chosen = answers.isAppOnly ? 'app_only' : 'web_and_app';
  // Until the switch is on (it waits for the apps), the line says nothing changes yet.
  const hint = isOn('app_only_stories', false) ? t(`readOn.hints.${chosen}`) : t('readOn.notYet');
  return (
    <FormSection legend={t('readOn.heading')}>
      <ChoiceChips
        label={t('readOn.label')}
        options={readOnChoices.map((choice) => ({
          value: choice,
          label: t(`readOn.options.${choice}`),
        }))}
        value={chosen}
        onChange={(value) => set('isAppOnly', value === 'app_only')}
        descriptionId="story-read-on-hint"
        description={hint}
      />
    </FormSection>
  );
}
