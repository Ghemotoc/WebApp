/**
 * StoryWhoCanReadSection: "Who can read this story?" in Story settings, as board D07 draws it
 * (BOOKS D07, user story 5.7).
 *
 * One card with two parts: "Visibility" as three radio rows (Public, Unlisted, Private), each
 * with the line that says what it means under its name, and "App only" as a switch with its line.
 * App only combines with Public or Unlisted (NEW-1). The switch's line says that nothing changes
 * until the apps exist and staff turn 'app_only_stories' on (Q35, 16 Oct 2026, late evening), so
 * nobody is surprised.
 * Who uses it: StorySettingsPage. The New story wizard keeps its own step (StoryVisibilitySection).
 * What it calls: Switch and useFeatureFlags(); the answers are saved with the rest of the form by
 * updateMyStory().
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/Switch';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { storyVisibilities } from '@/schemas/story';
import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryWhoCanReadSectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
}

/**
 * The three Visibility rows: real radio buttons, so arrow keys move between them, each with its
 * name and the line that explains it.
 *
 * @returns the fieldset
 */
function VisibilityRadios({ answers, set }: StoryWhoCanReadSectionProps) {
  const { t } = useTranslation('writing');
  const groupName = useId();
  return (
    <fieldset className="m-0 flex flex-col border-0 p-0">
      <legend className="mb-1 p-0 type-label text-ink">{t('whoCanReadCard.visibility')}</legend>
      {storyVisibilities.map((visibility) => (
        // The name is the radio's label and the line its description, so a screen reader hears
        // "Unlisted, radio button" and then what Unlisted means.
        <label key={visibility} className="flex cursor-pointer items-start gap-3 py-2">
          <input
            type="radio"
            name={groupName}
            value={visibility}
            checked={answers.visibility === visibility}
            onChange={() => set('visibility', visibility)}
            aria-labelledby={`${groupName}-${visibility}-name`}
            aria-describedby={`${groupName}-${visibility}-hint`}
            className="mt-px size-5 shrink-0 accent-primary"
          />
          <span className="flex flex-col">
            <span id={`${groupName}-${visibility}-name`} className="type-label text-ink-heading">
              {t(`visibility.options.${visibility}`)}
            </span>
            <span id={`${groupName}-${visibility}-hint`} className="type-meta text-ink-muted">
              {t(`visibility.hints.${visibility}`)}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The App only row: its name and line on the left, the switch on the right. The line is the
 * switch's description, so a screen reader hears it after the name.
 *
 * @returns the row
 */
function AppOnlySwitch({ answers, set }: StoryWhoCanReadSectionProps) {
  const { t } = useTranslation('writing');
  const { isOn } = useFeatureFlags();
  const hintId = useId();
  // Until the switch is on (it waits for the apps), the line says nothing changes yet.
  const chosen = answers.isAppOnly ? 'app_only' : 'web_and_app';
  const hint = isOn('app_only_stories', false) ? t(`readOn.hints.${chosen}`) : t('readOn.notYet');
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex min-w-0 flex-col">
        {/* The visible name; the switch carries the same words as its accessible name. */}
        <span aria-hidden="true" className="type-label text-ink-heading">
          {t('whoCanReadCard.appOnly')}
        </span>
        <span id={hintId} className="type-meta text-ink-muted">
          {hint}
        </span>
      </span>
      <Switch
        label={t('whoCanReadCard.appOnly')}
        isOn={answers.isAppOnly}
        onToggle={() => set('isAppOnly', !answers.isAppOnly)}
        describedBy={hintId}
      />
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the section with Visibility and App only
 */
export function StoryWhoCanReadSection({ answers, set }: StoryWhoCanReadSectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection legend={t('whoCanReadCard.heading')}>
      <div className="flex flex-col gap-4">
        <VisibilityRadios answers={answers} set={set} />
        <AppOnlySwitch answers={answers} set={set} />
      </div>
    </FormSection>
  );
}
