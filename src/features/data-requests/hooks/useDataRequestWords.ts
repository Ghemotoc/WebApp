/**
 * useDataRequestWords: the words staff read for a data request's type, channel, identity check,
 * dates and urgency (bundle ADMIN-2, part c1; story S1-E11-09).
 *
 * Who calls it: the staff list and page in components/staff/. What it calls:
 * lib/dataRequestDates.ts and the "dataRequests" texts.
 */
import { romaniaNowFields } from '@/lib/romania-time';

import type { DataRequest } from '../api/dataRequests';
import { daysLeft, formatCalendarDate } from '../lib/dataRequestDates';
import { useDataRequestsTranslation } from '../registerDataRequestsTranslations';

/**
 * The word helpers.
 *
 * @returns type(), channel(), identity(), date() and urgency() for one request
 */
export function useDataRequestWords() {
  const { t, i18n } = useDataRequestsTranslation();
  return {
    type: (request: DataRequest) => t(`staff.types.${request.requestType}`),
    channel: (request: DataRequest) => t(`staff.channels.${request.channel}`),
    identity: (request: DataRequest) => identityWords(t, request),
    date: (calendarDate: string) => formatCalendarDate(calendarDate, i18n.language),
    urgency: (request: DataRequest) => urgencyWords(t, request),
  };
}

/**
 * Where the identity check stands, saying so when the parent or guardian is the one checked
 * (part c3): "Asked the parent or guardian", "Confirmed by the parent or guardian".
 *
 * @returns the words
 */
function identityWords(
  t: ReturnType<typeof useDataRequestsTranslation>['t'],
  request: DataRequest,
): string {
  if (request.goesToParent) return t(`staff.parentIdentity.${request.identity}`);
  return t(`staff.identity.${request.identity}`);
}

/**
 * The urgency pill's words: "Overdue", "Due today", "Due in 5 days", "On time" or "Closed".
 *
 * @param t - the "dataRequests" translation function
 * @param request - the request
 * @returns the words
 */
function urgencyWords(
  t: ReturnType<typeof useDataRequestsTranslation>['t'],
  request: DataRequest,
): string {
  if (
    request.urgency === 'overdue' ||
    request.urgency === 'on_time' ||
    request.urgency === 'closed'
  ) {
    return t(`staff.urgency.${request.urgency}`);
  }
  // The 7-day reminder and the 2-day alert say how many days are left (criterion 2, proposal).
  const today = romaniaNowFields(new Date()).date;
  const count = daysLeft(request.deadline, today);
  if (count <= 0) return t('staff.urgency.dueToday');
  return t('staff.urgency.due', { count });
}
