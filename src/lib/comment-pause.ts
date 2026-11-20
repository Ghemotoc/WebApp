/**
 * Whether a writer's pause of new comments still runs (bundle CALM-8; IDEA-20261109-8; the design
 * handover's Step 4, "Pausing new comments").
 *
 * A story holds the end of its pause in stories.comments_paused_until. The database clears it
 * every 5 minutes (end_comment_pauses(), …_calm8_pause_comments.sql), so for a few minutes the
 * story can still hold an end that has passed; comments are open again from that moment, and every
 * screen compares the end with the time now instead of trusting the column alone.
 * Who calls it: the "Pause new comments" switch (src/features/writing/lib/commentPause.ts), the
 * paused line in place of the comment box (src/features/comments/) and the paragraph markers
 * (src/features/reading/components/ParagraphCommentMarker.tsx).
 * What it calls: nothing.
 */

/**
 * The end of a pause while it runs.
 *
 * @param pausedUntil - when new comments open again (ISO time), or null when none was set
 * @param now - the time now
 * @returns the end while it is still ahead; null when none was set or it has passed
 */
export function runningPauseEnd(pausedUntil: string | null, now: Date): Date | null {
  if (pausedUntil === null) return null;
  const end = new Date(pausedUntil);
  return end.getTime() > now.getTime() ? end : null;
}
