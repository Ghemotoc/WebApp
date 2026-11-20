/**
 * What the "Pause new comments" switch shows, and what flipping it asks for (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, "Pausing new comments", points 1 to 3). Kept
 * apart from the screen so the rules can be tested on their own.
 *
 * Two things decide it: the writer's answer in the form (StoryAnswers.commentPause: a length, 'off'
 * or null for "as saved") and the pause the story holds (MyStory.commentsPausedUntil):
 * - nothing asked, no pause running: the switch is off;
 * - a length asked: on, with "For how long" and the end that length gives from now (the database
 *   works out the real end on its own clock when the form saves);
 * - nothing asked, a pause running: on, with the end the story holds;
 * - 'off' asked while a pause runs: off; the save ends the pause.
 * Who calls it: components/CommentPauseField.tsx. What it calls: runningPauseEnd() in
 * src/lib/comment-pause.ts, as the story can still hold an end that has passed for a few minutes.
 */
import { runningPauseEnd } from '@/lib/comment-pause';
import type { CommentPauseChoice, CommentPauseLength } from '@/schemas/story';

/** Each length in hours (24 hours, 3 days, 7 days), for the end shown before the save. */
const hoursOf: Record<CommentPauseLength, number> = { '24h': 24, '3d': 72, '7d': 168 };

/** The length "For how long" starts on (the handover: "24 hours chosen"). */
export const FIRST_PAUSE_LENGTH: CommentPauseLength = '24h';

/** What the switch shows. */
export interface CommentPauseView {
  isOn: boolean;
  /** The length picked in "For how long" while the writer chooses one; null otherwise. */
  choosing: CommentPauseLength | null;
  /** When new comments open again: the end the story holds or the one the pick gives; null when off. */
  end: Date | null;
}

/**
 * When a pause of the given length would end if it started now.
 *
 * @param length - 24 hours, 3 days or 7 days
 * @param now - the time now
 * @returns the end
 */
export function pauseEndFrom(length: CommentPauseLength, now: Date): Date {
  return new Date(now.getTime() + hoursOf[length] * 60 * 60 * 1000);
}

/**
 * What the switch shows for the writer's answer and the story's pause.
 *
 * @param answer - the pause asked for in this save, or null for "as saved"
 * @param pausedUntil - stories.comments_paused_until, or null
 * @param now - the time now
 * @returns whether it is on, the length being picked and the end to name
 */
export function commentPauseView(
  answer: CommentPauseChoice | null,
  pausedUntil: string | null,
  now: Date,
): CommentPauseView {
  // Step 1: the writer turned the switch off: no pause once the form saves.
  if (answer === 'off') return { isOn: false, choosing: null, end: null };
  // Step 2: the writer picked a length: a new pause from the save.
  if (answer !== null) return { isOn: true, choosing: answer, end: pauseEndFrom(answer, now) };
  // Step 3: nothing asked: the switch shows the story's own pause, while it runs.
  const runningEnd = runningPauseEnd(pausedUntil, now);
  return { isOn: runningEnd !== null, choosing: null, end: runningEnd };
}

/**
 * The answer once the writer flips the switch.
 *
 * @param answer - the pause asked for so far, or null for "as saved"
 * @param pausedUntil - stories.comments_paused_until, or null
 * @param now - the time now
 * @returns turning off: 'off' when a pause runs (the save ends it), null when it was only picked
 *   in this form; turning on: null when a pause runs (back to it, as saved), otherwise a new pause
 *   of 24 hours
 */
export function answerAfterToggle(
  answer: CommentPauseChoice | null,
  pausedUntil: string | null,
  now: Date,
): CommentPauseChoice | null {
  const isRunning = runningPauseEnd(pausedUntil, now) !== null;
  // Step 1: turning off.
  if (commentPauseView(answer, pausedUntil, now).isOn) return isRunning ? 'off' : null;
  // Step 2: turning on.
  return isRunning ? null : FIRST_PAUSE_LENGTH;
}
