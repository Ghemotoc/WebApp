/**
 * StoryStatusSection: "Status and comments" (story S1-E3-05; board NewStory 4.2 section 4 and
 * Chapters 4.4, "The whole story").
 *
 * Board values: Status as a segmented Ongoing | Completed with "Shown on your story card.
 * Readers can filter by it."; Comments as a switch (role="switch", 60 × 34 px) with "On. Readers
 * can comment on every chapter." or "Off. Existing comments are hidden and nobody can add new
 * ones." The switch is stored now and enforced by S1-E6-01.
 * Who uses it: StorySettingsPage (the new story form keeps the defaults; docs/board-fixes.md).
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryStatusSectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryStatusSection({ answers, set }: StoryStatusSectionProps) {
  const { t } = useTranslation('writing');
  const commentsNoteId = 'story-comments-note';
  return (
    <FormSection legend={t('status.heading')}>
      <ChoiceChips
        label={t('status.label')}
        isLabelVisible
        options={[
          { value: 'ongoing', label: t('status.ongoing') },
          { value: 'completed', label: t('status.completed') },
        ]}
        value={answers.completionStatus}
        onChange={(value) =>
          set('completionStatus', value === 'completed' ? 'completed' : 'ongoing')
        }
        descriptionId="story-status-hint"
        description={t('status.hint')}
      />
      <div className="flex flex-col gap-1.5">
        <span id="story-comments-label" className="text-sm font-semibold text-ink">
          {t('comments.label')}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={answers.commentsEnabled}
            aria-labelledby="story-comments-label"
            aria-describedby={commentsNoteId}
            onClick={() => set('commentsEnabled', !answers.commentsEnabled)}
            className={`relative inline-flex h-[34px] w-[60px] shrink-0 items-center rounded-full border transition-colors ${
              answers.commentsEnabled
                ? 'border-chip-on bg-chip-on'
                : 'border-dashed-border bg-panel'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-[3px] size-[26px] rounded-full bg-surface shadow-card transition-[left] ${
                answers.commentsEnabled ? 'left-[29px]' : 'left-[3px]'
              }`}
            />
          </button>
          <p id={commentsNoteId} className="m-0 text-sm text-body">
            {answers.commentsEnabled ? t('comments.on') : t('comments.off')}
          </p>
        </div>
      </div>
    </FormSection>
  );
}
