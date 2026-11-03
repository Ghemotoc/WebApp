/**
 * What the "staff opened an uploaded picture" alert says (bundle ADMIN-2, part e2a; Robert's brief
 * of 2 Nov 2026, section 5: every download or fetch of an uploaded image's original file by staff
 * goes to the audit log and alerts the owner at once, by email and in the admin site).
 *
 * The row names the staff member (one row per staff member per hour) and leads to the audit log,
 * which lists every picture they opened. Only owners and the usernames in the setting
 * picture_open_alert_handles get it, and it is always on.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a picture_opened_by_staff row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; its actor is the staff member who opened the pictures
 * @returns the row's words and the link to the audit log
 */
export function pictureOpenedText(t: TFunction, notification: AppNotification): NotificationText {
  return {
    // One staff member per row: the grouping key is theirs (record_picture_opened()).
    who: notification.actors[0]?.displayName ?? t('who.someone'),
    what: t('what.pictureOpenedByStaff'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.openAuditLog'),
    href: '/staff/audit-log',
  };
}
