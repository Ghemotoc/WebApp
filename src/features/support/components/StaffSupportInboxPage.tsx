/**
 * StaffSupportInboxPage: /staff/support, the one inbox of support tickets (story S1-E11-13;
 * bundle ADMIN-2h1; architecture 1.8.2: "Support tickets").
 *
 * Every ticket not yet solved or closed to start with, most urgent and longest waiting first,
 * with filters for the status and who it is assigned to. Part h3a adds the saved views with their
 * counts above the filters and the first-reply timer on each row. Plain components, no doodles (staff screens). The database refuses anyone without the
 * support_tickets area (owner, admin, support), and the page says so.
 * Who shows it: the router, inside StaffLayout. What it calls: useSupportInbox.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import { ticketStatuses } from '../api/supportTickets';
import type { StaffTicketSummary, SupportInboxFilters } from '../api/staffSupportTickets';
import { useSupportInbox } from '../hooks/useStaffSupport';
import { useSupportTranslation } from '../registerSupportTranslations';

import { FirstReplyPill } from './FirstReplyPill';
import { SupportViewChips } from './SupportViewChips';

/**
 * Who a ticket is assigned to, in words.
 *
 * @returns the line
 */
function useAssignedLine(ticket: StaffTicketSummary): string {
  const { t } = useSupportTranslation();
  if (ticket.assignedToMe) return t('staff.assignedToYou');
  if (ticket.assignedHandle !== null)
    return t('staff.assignedTo', { handle: ticket.assignedHandle });
  return t('staff.unassigned');
}

/**
 * One ticket in the inbox.
 *
 * @returns a list item
 */
function InboxRow({ ticket }: { ticket: StaffTicketSummary }) {
  const { t, i18n } = useSupportTranslation();
  const assigned = useAssignedLine(ticket);
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ticket.lastMessageAt));
  const who =
    ticket.requesterHandle === null
      ? t('staff.fromEmail')
      : t('staff.fromHandle', { handle: ticket.requesterHandle });
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/staff/support/${String(ticket.number)}`}
          className="font-semibold break-words text-link underline"
        >
          {ticket.subject}
        </Link>
        <div className="flex flex-wrap gap-2">
          <FirstReplyPill ticket={ticket} />
          <InfoPill tone={ticket.priority === 'urgent' ? 'blush' : 'neutral'}>
            {t(`staff.priorities.${ticket.priority}`)}
          </InfoPill>
          <InfoPill tone={ticket.status === 'new' ? 'gold' : 'neutral'}>
            {t(`statuses.${ticket.status}`)}
          </InfoPill>
        </div>
      </div>
      <p className="m-0 text-sm text-meta">
        {t('staff.rowMeta', {
          number: ticket.number,
          who,
          channel: t(`staff.channels.${ticket.channel}`),
          count: ticket.messageCount,
          date: when,
        })}
      </p>
      <p className="m-0 text-sm text-body">{assigned}</p>
    </li>
  );
}

/**
 * The filters.
 *
 * @returns the two drop-downs
 */
function InboxFiltersRow({
  filters,
  onChange,
}: {
  filters: SupportInboxFilters;
  onChange: (filters: SupportInboxFilters) => void;
}) {
  const { t } = useSupportTranslation();
  const statusOptions = [
    { value: '', label: t('staff.openStatuses') },
    ...ticketStatuses.map((value) => ({ value, label: t(`statuses.${value}`) })),
    { value: 'all', label: t('staff.allStatuses') },
  ];
  return (
    <div
      role="group"
      aria-label={t('staff.filtersLabel')}
      className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <Select
        id="support-status"
        label={t('staff.status')}
        isLabelVisible
        value={filters.status}
        onChange={(value) =>
          onChange({ ...filters, status: value as SupportInboxFilters['status'] })
        }
        options={statusOptions}
      />
      <Select
        id="support-assigned"
        label={t('staff.assigned')}
        isLabelVisible
        value={filters.assigned}
        onChange={(value) =>
          onChange({ ...filters, assigned: value as SupportInboxFilters['assigned'] })
        }
        options={[
          { value: '', label: t('staff.assignedAll') },
          { value: 'mine', label: t('staff.assignedMine') },
          { value: 'nobody', label: t('staff.assignedNobody') },
        ]}
      />
    </div>
  );
}

/**
 * The list, or why there is none.
 *
 * @returns the list part
 */
function InboxList({ state }: { state: ReturnType<typeof useSupportInbox> }) {
  const { t } = useSupportTranslation();
  if (state.failure === 'not_allowed')
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  if (state.failure !== null) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (state.inbox.data === undefined) return <p className="m-0 text-meta">{t('staff.loading')}</p>;
  if (state.inbox.data.length === 0) return <p className="m-0 text-body">{t('staff.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t('staff.listLabel')}>
      {state.inbox.data.map((ticket) => (
        <InboxRow key={ticket.number} ticket={ticket} />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function StaffSupportInboxPage() {
  const { t } = useSupportTranslation();
  const state = useSupportInbox();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staff.heading')}
        </h1>
        <p className="m-0 text-body">{t('staff.intro')}</p>
      </div>
      <SupportViewChips
        filters={state.filters}
        counts={state.counts.data}
        onChoose={state.setFilters}
      />
      <InboxFiltersRow filters={state.filters} onChange={state.setFilters} />
      <InboxList state={state} />
    </PageContainer>
  );
}
