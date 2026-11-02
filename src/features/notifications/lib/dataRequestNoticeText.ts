/**
 * What the three data request notices say (bundle ADMIN-2, parts c1 and c2; story S1-E11-09
 * criteria 3, 4 and "the files are ready"): the team asks whether a request that came by email or
 * post was the person's, tells them it needs more time and why, or that the copy they asked for is
 * ready. All lead to Settings › Data requests, which shows the deadline, where the person answers
 * and the files to download; all are always on.
 *
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a data_request_confirm, data_request_extended or data_request_copy_ready row.
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
  if (notification.kind === 'data_request_copy_ready') {
    return {
      who: t('who.yourAccount'),
      what: t('what.dataRequestCopyReady', { reference }),
      quote: null,
      grouped: null,
      actionLabel: t('actions.downloadDataRequestCopy'),
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
