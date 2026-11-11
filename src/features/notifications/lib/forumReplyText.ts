/**
 * What the "new replies in a thread you follow" notification says (bundle GAPS-16, part a; story
 * S1-E8-02; board 5.2, "Follow thread").
 *
 * A member who follows a forum thread gets one row a day per thread while replies come in: "ana
 * replied in “Show your first lines”", and with more people "ana, corbu and 3 others replied in
 * …". The action opens the thread, which starts at the first post the reader hasn't seen.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import { whoDidIt, type NotificationText } from './notificationText';

/**
 * The words of a forum_reply row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; forumThread is the thread, or null once the reader can't open it
 * @returns the row's words and the link to the thread
 */
export function forumReplyText(t: TFunction, notification: AppNotification): NotificationText {
  const thread = notification.forumThread;
  return {
    who: whoDidIt(t, notification),
    // The count picks "a răspuns" or "au răspuns" in Romanian.
    what: t('what.forumReply', { title: thread?.title ?? '', count: notification.actorCount }),
    quote: null,
    grouped: null,
    // The server leaves the thread out once the reader can't open it; the row then has no link.
    actionLabel: thread === null ? null : t('actions.openThread'),
    href: thread === null ? null : `/forums/${thread.forumSlug}/${thread.number}`,
  };
}
