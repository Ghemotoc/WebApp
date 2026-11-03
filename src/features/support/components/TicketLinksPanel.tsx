/**
 * TicketLinksPanel: on a support ticket, the way to the moderation team (Convert to report) and
 * to data requests (Open data request), with what the ticket already started (story S1-E11-13,
 * part 13b; bundle ADMIN-2h4b; criteria 10 and 11). Tickets never replace reports: the notice goes
 * through the same moderation queue as everyone else's (DSA art. 16).
 *
 * Who shows it: StaffSupportTicketPage. What it calls: useTicketLinks, ConvertToReportForm and
 * OpenDataRequestForm.
 */
import { Link } from 'react-router';

import type { StaffTicket } from '../api/staffSupportTickets';
import { useTicketLinks } from '../hooks/useTicketLinks';
import { useSupportTranslation } from '../registerSupportTranslations';

import { ConvertToReportForm } from './ConvertToReportForm';
import { OpenDataRequestForm } from './OpenDataRequestForm';

/**
 * What the ticket started so far: notice references and links to data requests.
 *
 * @returns the list, or nothing when there is none
 */
function StartedFromTicket({ state }: { state: ReturnType<typeof useTicketLinks> }) {
  const { t } = useSupportTranslation();
  const links = state.links.data;
  if (links === undefined || links.notices.length + links.dataRequests.length === 0) return null;
  return (
    <ul
      className="m-0 flex list-none flex-col gap-1 p-0"
      aria-label={t('staff.links.startedLabel')}
    >
      {links.notices.map((notice) => (
        <li key={notice.reference} className="text-sm text-body">
          {t('staff.links.noticeLine', { reference: notice.reference })}
        </li>
      ))}
      {links.dataRequests.map((request) => (
        <li key={request.id} className="text-sm text-body">
          <Link to={`/staff/data-requests/${request.id}`}>
            {t('staff.links.requestLine', {
              reference: request.reference,
              type: t(`staff.links.requestTypes.${request.type}`),
              due: request.dueOn,
            })}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the panel. A spam ticket shows only what it started.
 *
 * @returns the section
 */
export function TicketLinksPanel({ ticket }: { ticket: StaffTicket }) {
  const { t } = useSupportTranslation();
  const state = useTicketLinks(ticket.number);
  return (
    <section
      aria-labelledby="ticket-links-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="ticket-links-heading" className="m-0 font-heading text-[20px] font-bold text-heading">
        {t('staff.links.heading')}
      </h2>
      <StartedFromTicket state={state} />
      {!ticket.isSpam && <ConvertToReportForm state={state} />}
      {!ticket.isSpam && (
        <OpenDataRequestForm state={state} hasAccount={ticket.requester.userId !== null} />
      )}
    </section>
  );
}
