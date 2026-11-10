/**
 * What the "a live session starts soon" notification says (bundle GAPS-12h; board WritersHub,
 * "Live sessions · Remind me").
 *
 * A member who pressed Remind me on a live session gets this one row in the hour before it
 * starts. It names the session by its title in the member's language, gives the start on this
 * device's clock and leads to the hub's list; once staff deleted the session the row stays
 * without a link.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import { dateLocaleFor } from '@/lib/romania-time';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a live_session_soon row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; liveSession is the session, or null once it is deleted
 * @returns the row's words and the link to the hub's list of sessions
 */
export function liveSessionSoonText(t: TFunction, notification: AppNotification): NotificationText {
  const session = notification.liveSession;
  if (session === null) {
    // The session was deleted: the row still says what happened, without a link.
    return {
      who: t('who.reminder'),
      what: t('what.liveSessionSoonGone'),
      quote: null,
      grouped: null,
      actionLabel: null,
      href: null,
    };
  }
  // The translation file says which language this reader's notifications are in.
  const language = t('pageLanguage');
  const title = language === 'ro' ? session.titles.ro : session.titles.en;
  // The start as hours and minutes on this device's clock, so it is right in every country.
  const time = new Intl.DateTimeFormat(dateLocaleFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(session.startsAt));
  return {
    who: t('who.reminder'),
    what: t('what.liveSessionSoon', { title, time }),
    quote: null,
    grouped: null,
    actionLabel: t('actions.openWritersHub'),
    href: '/hub#hub-sessions',
  };
}
