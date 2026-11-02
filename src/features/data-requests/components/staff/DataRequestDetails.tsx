/**
 * DataRequestDetails: one data request's facts as label rows: the person and their user ID, what
 * they asked for, how and when it reached us, the deadline and any extension, the identity check,
 * who last handled it (the person links to their account in Users), the team's note and, once closed, what was done (bundle ADMIN-2, part c1;
 * story S1-E11-09 criterion "a request is closed": the log keeps all of this, never the files).
 *
 * Who shows it: StaffDataRequestPage. Staff may see user IDs (architecture 1.6).
 */
import { Link } from 'react-router';

import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';
import { ShortUserId } from '@/features/staff/components/users/ShortUserId';

import type { DataRequest } from '../../api/dataRequests';
import { useDataRequestWords } from '../../hooks/useDataRequestWords';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestUrgencyPill } from './DataRequestUrgencyPill';

/**
 * The rows that only some requests have: the extension and what was done.
 *
 * @returns the extra rows
 */
function useOptionalRows() {
  const { t } = useDataRequestsTranslation();
  const words = useDataRequestWords();
  return (request: DataRequest): LabelRow[] => {
    const rows: LabelRow[] = [];
    if (request.extendedTo !== null) {
      rows.push({ label: t('page.rows.extendedTo'), value: words.date(request.extendedTo) });
      rows.push({ label: t('page.rows.extensionReason'), value: request.extensionReason ?? '' });
    }
    if (request.outcome !== null)
      rows.push({ label: t('page.rows.outcome'), value: request.outcome });
    if (request.closedAt !== null) {
      rows.push({
        label: t('page.rows.closedOn'),
        value: words.date(request.closedAt.slice(0, 10)),
      });
    }
    return rows;
  };
}

/**
 * Renders the rows.
 *
 * @param props.request - the request
 * @returns the label rows
 */
export function DataRequestDetails({ request }: { request: DataRequest }) {
  const { t } = useDataRequestsTranslation();
  const words = useDataRequestWords();
  const optionalRows = useOptionalRows();
  const rows: LabelRow[] = [
    {
      label: t('page.rows.person'),
      // The account's page in Users, as the board's "Open in Users" (screen 8.12).
      value: (
        <Link to={`/staff/users/${request.userId}`} className="text-link underline">
          {request.handle === null ? t('staff.noHandle') : `@${request.handle}`}
        </Link>
      ),
    },
    { label: t('page.rows.userId'), value: <ShortUserId userId={request.userId} /> },
    { label: t('page.rows.type'), value: words.type(request) },
    { label: t('page.rows.channel'), value: words.channel(request) },
    { label: t('page.rows.received'), value: words.date(request.receivedOn) },
    { label: t('page.rows.dueOn'), value: words.date(request.dueOn) },
    { label: t('page.rows.status'), value: <DataRequestUrgencyPill request={request} /> },
    { label: t('page.rows.identity'), value: words.identity(request) },
    {
      label: t('page.rows.handledBy'),
      value: request.handledByHandle === null ? '' : `@${request.handledByHandle}`,
    },
    { label: t('page.rows.note'), value: request.note === '' ? t('page.noNote') : request.note },
    ...optionalRows(request),
  ];
  return <LabelRows rows={rows} />;
}
