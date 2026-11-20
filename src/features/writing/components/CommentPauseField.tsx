/**
 * CommentPauseField: "Pause new comments" in Story settings › Status and comments, straight under
 * "Who can comment" (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, "Pausing new
 * comments", points 1 to 4).
 *
 * A switch, off by default, with the note "Comments already posted stay, and reporting still
 * works." Turning it on shows "For how long" (24 hours, 3 days or 7 days; 24 hours chosen) and the
 * note becomes "Paused until Sunday 22 November, 18:40." It saves with the form:
 * update_my_story() works out the real end on the database's clock. While a pause runs, the
 * switch is on and the note names its end; turning it off ends the pause when the form saves.
 * StoryStatusSection leaves it out when Who can comment is Nobody: there is nothing to pause.
 * The switch is the section's own StorySwitch (role="switch"; there is no shared Switch yet) and
 * "For how long" the shared SegmentedControl, a radio group; CALM-4 and CALM-5 restyle them later.
 * Who uses it: StoryStatusSection. What it calls: lib/commentPause.ts for what to show, and
 * formatLocalDayAndTime() for the end, in the writer's own local time (CALM-8b): a pause is a
 * length the writer picks, not a time they type, so it reads like the times readers see.
 */
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatLocalDayAndTime } from '@/lib/local-time';
import {
  commentPauseLengths,
  type CommentPauseChoice,
  type CommentPauseLength,
} from '@/schemas/story';

import { answerAfterToggle, commentPauseView } from '../lib/commentPause';

import { StorySwitch } from './StorySwitch';

/** What the field needs. */
export interface CommentPauseFieldProps {
  /** The pause asked for in this save (StoryAnswers.commentPause), or null for "as saved". */
  answer: CommentPauseChoice | null;
  /** When the story's saved pause ends (MyStory.commentsPausedUntil), or null. */
  pausedUntil: string | null;
  /** Called with the new answer when the writer flips the switch or picks a length. */
  onChange: (answer: CommentPauseChoice | null) => void;
}

/**
 * Renders the switch and, while the writer picks a length, "For how long".
 *
 * @returns the field
 */
export function CommentPauseField({ answer, pausedUntil, onChange }: CommentPauseFieldProps) {
  const { t, i18n } = useTranslation('writing');
  // Step 1: what the switch shows now: on or off, the length being picked and the end.
  const view = commentPauseView(answer, pausedUntil, new Date());
  // Step 2: the note names the end while on, or says what a pause leaves alone while off.
  const note =
    view.end === null
      ? t('commentPause.offNote')
      : t('commentPause.until', { when: formatLocalDayAndTime(view.end, i18n.language) });
  const lengthOptions = commentPauseLengths.map((length) => ({
    value: length,
    label: t(`commentPause.lengths.${length}`),
  }));
  return (
    <div className="flex flex-col gap-4">
      <StorySwitch
        idPrefix="story-comment-pause"
        label={t('commentPause.label')}
        isOn={view.isOn}
        note={note}
        onToggle={() => onChange(answerAfterToggle(answer, pausedUntil, new Date()))}
      />
      {view.choosing !== null && (
        <SegmentedControl<CommentPauseLength>
          legend={t('commentPause.lengthLabel')}
          name="story-comment-pause-length"
          options={lengthOptions}
          value={view.choosing}
          onChange={onChange}
        />
      )}
    </div>
  );
}
