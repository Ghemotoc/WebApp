/**
 * What the "assignment due soon" notification says (bundle MUST-1, part d; IDEA-20261108-8).
 *
 * A student in a class space who hasn't replied to an assignment gets one row in the 24 hours before it
 * is due (CALM-7d): "Reminder: “Tema 1” is due within a day." The action opens the thread.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of an assignment_due row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; forumThread is the assignment, or null once the reader can't
 *   open it
 * @returns the row's words and the link to the thread
 */
export function assignmentDueText(t: TFunction, notification: AppNotification): NotificationText {
  const thread = notification.forumThread;
  return {
    who: t('who.reminder'),
    what: t('what.assignmentDue', { title: thread?.title ?? '' }),
    quote: null,
    grouped: null,
    // The server leaves the thread out once the reader can't open it; the row then has no link.
    actionLabel: thread === null ? null : t('actions.openThread'),
    href: thread === null ? null : `/forums/${thread.forumSlug}/${thread.number}`,
  };
}
