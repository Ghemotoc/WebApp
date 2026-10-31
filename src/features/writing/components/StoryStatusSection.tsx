/**
 * StoryStatusSection: "Status and comments" (story S1-E3-05; board NewStory 4.2 section 4 and
 * Chapters 4.4, "The whole story").
 *
 * Board values: Status as a segmented Ongoing | Completed with "Shown on your story card.
 * Readers can filter by it."; Comments as a switch (role="switch", 60 × 34 px) with "On. Readers
 * can comment on every chapter." or "Off. Existing comments are hidden and nobody can add new
 * ones." The switch is stored now and enforced by S1-E6-01. A second switch, Quote cards
 * (S1-E4-07, third criterion), hides "Share quote" on every chapter when it is off.
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

/** What one switch needs. */
interface StorySwitchProps {
  /** Starts the ids of the label and the note, which must be unique on the page. */
  idPrefix: string;
  label: string;
  isOn: boolean;
  /** The line beside the switch saying what on or off means now. */
  note: string;
  onToggle: () => void;
}

/**
 * One on/off switch as the board draws it: role="switch", 60 x 34 px, with its note beside it.
 *
 * @returns the label, the switch and the note
 */
function StorySwitch({ idPrefix, label, isOn, note, onToggle }: StorySwitchProps) {
  const labelId = `${idPrefix}-label`;
  const noteId = `${idPrefix}-note`;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby={labelId}
          aria-describedby={noteId}
          onClick={onToggle}
          className={`relative inline-flex h-[34px] w-[60px] shrink-0 items-center rounded-full border transition-colors ${
            isOn ? 'border-chip-on bg-chip-on' : 'border-dashed-border bg-panel'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-[3px] size-[26px] rounded-full bg-surface shadow-card transition-[left] ${
              isOn ? 'left-[29px]' : 'left-[3px]'
            }`}
          />
        </button>
        <p id={noteId} className="m-0 text-sm text-body">
          {note}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryStatusSection({ answers, set }: StoryStatusSectionProps) {
  const { t } = useTranslation('writing');
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
      <StorySwitch
        idPrefix="story-comments"
        label={t('comments.label')}
        isOn={answers.commentsEnabled}
        note={answers.commentsEnabled ? t('comments.on') : t('comments.off')}
        onToggle={() => set('commentsEnabled', !answers.commentsEnabled)}
      />
      <StorySwitch
        idPrefix="story-quote-cards"
        label={t('quoteCards.label')}
        isOn={answers.quoteCardsEnabled}
        note={answers.quoteCardsEnabled ? t('quoteCards.on') : t('quoteCards.off')}
        onToggle={() => set('quoteCardsEnabled', !answers.quoteCardsEnabled)}
      />
      <StorySwitch
        idPrefix="story-picture-sharing"
        label={t('pictureSharing.label')}
        isOn={answers.pictureSharingEnabled}
        note={answers.pictureSharingEnabled ? t('pictureSharing.on') : t('pictureSharing.off')}
        onToggle={() => set('pictureSharingEnabled', !answers.pictureSharingEnabled)}
      />
    </FormSection>
  );
}
