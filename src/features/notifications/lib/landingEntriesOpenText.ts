/**
 * What the "entries are open" notification says (story S1-E11-14 criterion 8; bundle
 * CONTESTS-13a2b).
 *
 * A reader who tapped Remind me on a landing page gets this one row on the day entries open. It
 * names the page by its title in the reader's language and leads to it; once the page is archived
 * the row stays without a link.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a landing_entries_open row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; landingPage is the page, or null once it is archived
 * @returns the row's words and the link to the page
 */
export function landingEntriesOpenText(
  t: TFunction,
  notification: AppNotification,
): NotificationText {
  const page = notification.landingPage;
  if (page === null) {
    // The page was archived: the row still says what happened, without a link.
    return {
      who: t('who.reminder'),
      what: t('what.landingEntriesOpenGone'),
      quote: null,
      grouped: null,
      actionLabel: null,
      href: null,
    };
  }
  // The page is written in Romanian and English; the translation file says which one this
  // reader's notifications are in ("ro" in the Romanian file, "en" in the English one).
  const isRomanian = t('pageLanguage') === 'ro';
  const title = isRomanian ? page.titles.ro : page.titles.en;
  return {
    who: t('who.reminder'),
    what: t('what.landingEntriesOpen', { title }),
    quote: null,
    grouped: null,
    actionLabel: t('actions.openLandingPage'),
    href: `/c/${page.slug}`,
  };
}
