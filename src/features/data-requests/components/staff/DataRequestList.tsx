/**
 * DataRequestList: the requests on Staff › Data requests (bundle ADMIN-2, part c1; story
 * S1-E11-09; screen 8.12): reference and person, what they asked for, when it was received, the
 * deadline with its pill and the identity check. A table on wide screens and label-row cards on
 * phones, as the Users results do (CLAUDE.md rule 21: nothing scrolls sideways at 390 px).
 *
 * Who shows it: StaffDataRequestsPage. What it reads: the requests from useStaffDataRequests.
 */
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { DataRequest } from '../../api/dataRequests';
import { useDataRequestWords } from '../../hooks/useDataRequestWords';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestUrgencyPill } from './DataRequestUrgencyPill';

/**
 * The request cell: the reference as a link to the request's page, and the person under it.
 *
 * @returns the cell's content
 */
function RequestCell({ request }: { request: DataRequest }) {
  const { t } = useDataRequestsTranslation();
  return (
    <span className="flex flex-col">
      <Link
        to={`/staff/data-requests/${request.id}`}
        className="font-semibold text-link underline"
        aria-label={t('staff.openRequest', { reference: request.reference })}
      >
        {request.reference}
      </Link>
      <span className="text-sm text-meta">
        {request.handle === null ? t('staff.noHandle') : `@${request.handle}`}
      </span>
    </span>
  );
}

/**
 * The cells after the first, in column order, with their headings.
 *
 * @returns cellsOf(request) and the headings
 */
function useColumns() {
  const { t } = useDataRequestsTranslation();
  const words = useDataRequestWords();
  return {
    headings: [
      t('staff.columns.type'),
      t('staff.columns.received'),
      t('staff.columns.deadline'),
      t('staff.columns.identity'),
      t('staff.columns.status'),
    ],
    cellsOf: (request: DataRequest) => [
      words.type(request),
      words.date(request.receivedOn),
      words.date(request.deadline),
      words.identity(request),
      <DataRequestUrgencyPill key="status" request={request} />,
    ],
  };
}

/**
 * Renders the list.
 *
 * @param props.requests - the requests to show
 * @returns the table and the phone cards
 */
export function DataRequestList({ requests }: { requests: DataRequest[] }) {
  const { t } = useDataRequestsTranslation();
  const { headings, cellsOf } = useColumns();
  return (
    <>
      <table className="hidden w-full border-collapse text-sm lg:table">
        <caption className="sr-only">{t('staff.listHeading')}</caption>
        <thead>
          <tr className="border-b border-border text-left text-meta">
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('staff.columns.request')}
            </th>
            {headings.map((heading) => (
              <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-border align-top">
              <td className="py-2.5 pr-4">
                <RequestCell request={request} />
              </td>
              {cellsOf(request).map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
        {requests.map((request) => (
          <li key={request.id} className="rounded-card border border-border bg-surface p-4">
            <RequestCell request={request} />
            <LabelRows
              rows={cellsOf(request).map((cell, index) => ({
                label: headings[index] ?? '',
                value: cell,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
