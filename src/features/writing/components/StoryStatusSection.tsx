/**
 * StoryStatusSection: "Status and comments" (story S1-E3-05; board NewStory 4.2 section 4 and
 * Chapters 4.4, "The whole story").
 *
 * Board values: Status as a segmented Ongoing | Completed with "Shown on your story card.
 * Readers can filter by it."; then "Who can comment" (MUST-1a, IDEA-20261106-2), one setting in
 * place of the board's Comments switch: Everyone, Followers only or Nobody, with a line saying
 * what the choice means. Nobody is the old switch turned off (comments_enabled); Followers only
 * is stories.comment_audience. The database enforces both (S1-E6-01). Straight under it, while
 * comments are on, "Pause new comments" (CALM-8, CommentPauseField). A switch, Quote cards
 * (S1-E4-07, third criterion), hides "Share quote" on every chapter when it is off. Then the
 * picture switch (S1-E4-11) and the card colour drop-down (IDEAS-1c, CardColourField).
 * Who uses it: StorySettingsPage (the new story form keeps the defaults; docs/board-fixes.md).
 * What it calls: ChoiceChips, CommentPauseField, StorySwitch and CardColourField.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { CardColourField } from './CardColourField';
import { CommentPauseField } from './CommentPauseField';
import { FormSection } from './FormSection';
import { StorySwitch } from './StorySwitch';

/** What the section needs. */
export interface StoryStatusSectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
  /** When the story's saved pause of new comments ends (CALM-8), or null; the new story form has none. */
  pausedUntil?: string | null;
}

/** The three answers of "Who can comment", as the chips show them. */
type CommentChoice = 'everyone' | 'followers' | 'nobody';

/**
 * Reads the one setting from the two stored answers: comments off is Nobody, whoever the audience.
 *
 * @returns the chip that is on
 */
function commentChoiceOf(answers: StoryAnswers): CommentChoice {
  if (!answers.commentsEnabled) return 'nobody';
  return answers.commentAudience;
}

/**
 * "Who can comment" (MUST-1a): one chip group that sets both stored answers.
 *
 * @returns the chip group with its note
 */
function CommentAudienceField({ answers, set }: Pick<StoryStatusSectionProps, 'answers' | 'set'>) {
  const { t } = useTranslation('writing');
  const choice = commentChoiceOf(answers);
  /** Nobody turns comments off and keeps the audience for when they come back on. */
  function pick(value: string) {
    if (value === 'nobody') {
      set('commentsEnabled', false);
      return;
    }
    set('commentsEnabled', true);
    set('commentAudience', value === 'followers' ? 'followers' : 'everyone');
  }
  return (
    <ChoiceChips
      label={t('comments.label')}
      isLabelVisible
      options={[
        { value: 'everyone', label: t('comments.everyone') },
        { value: 'followers', label: t('comments.followers') },
        { value: 'nobody', label: t('comments.nobody') },
      ]}
      value={choice}
      onChange={pick}
      descriptionId="story-comments-note"
      description={t(`comments.${choice}Note`)}
    />
  );
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryStatusSection({ answers, set, pausedUntil = null }: StoryStatusSectionProps) {
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
      <CommentAudienceField answers={answers} set={set} />
      {/* CALM-8: with Nobody there is nothing to pause (the handover's Step 4, point 4). */}
      {answers.commentsEnabled && (
        <CommentPauseField
          answer={answers.commentPause}
          pausedUntil={pausedUntil}
          onChange={(answer) => set('commentPause', answer)}
        />
      )}
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
      {/* IDEAS-1c: the colour readers' new quote and picture cards start in. */}
      <CardColourField
        value={answers.cardColour}
        onChange={(colour) => set('cardColour', colour)}
      />
    </FormSection>
  );
}
