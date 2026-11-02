/**
 * What the two data request notices say (bundle ADMIN-2, part c1; story S1-E11-09 criteria 3
 * and 4): the team asks whether a request that came by email or post was the person's, or tells
 * them it needs more time and why. Both lead to Settings › Data requests, which shows the
 * deadline and where the person answers; both are always on.
 *
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a data_request_confirm or data_request_extended row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; its kind says which
 * @returns the row's words; the extension's reason is the quote
 */
export function dataRequestNoticeText(
  t: TFunction,
  notification: AppNotification,
): NotificationText {
  const reference = notification.dataRequest?.reference ?? '';
  if (notification.kind === 'data_request_confirm') {
    return {
      who: t('who.yourAccount'),
      what: t('what.dataRequestConfirm', { reference }),
      quote: null,
      grouped: null,
      actionLabel: t('actions.answerDataRequest'),
      href: '/settings#data-requests',
    };
  }
  return {
    who: t('who.yourAccount'),
    what: t('what.dataRequestExtended', { reference }),
    quote: notification.dataRequest?.extensionReason ?? null,
    grouped: null,
    actionLabel: t('actions.seeDataRequests'),
    href: '/settings#data-requests',
  };
}
