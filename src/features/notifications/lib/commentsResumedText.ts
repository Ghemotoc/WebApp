/**
 * What the "new comments are open again" notification says (bundle CALM-8; IDEA-20261109-8; the
 * design handover's Step 4, "Pausing new comments": "Comments reopen by themselves and the writer
 * gets a quiet note").
 *
 * When a writer's pause of new comments runs out, end_comment_pauses() (the pg_cron job every
 * 5 minutes, supabase/migrations/…_calm8_pause_comments.sql) opens them again and leaves the
 * writer this one quiet row: in the app only, never an email or a push (email_delivery_for()
 * answers no delivery for this kind). A pause the writer ends themselves sends nothing.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a comments_resumed row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; story is the story whose comments opened again
 * @returns the row's words and the link to the story
 */
export function commentsResumedText(t: TFunction, notification: AppNotification): NotificationText {
  const story = notification.story;
  return {
    // Not a reminder: the note says what happened to the writer's story, so it leads with Story.
    who: t('who.story'),
    what: t('what.commentsResumed', { story: story?.title ?? '' }),
    quote: null,
    grouped: null,
    // The row leads to the story, when the reader may still open it.
    actionLabel: story === null ? null : t('actions.openStory'),
    href: story === null ? null : `/s/${story.slug}`,
  };
}
