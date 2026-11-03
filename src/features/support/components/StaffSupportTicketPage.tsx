/**
 * StaffSupportTicketPage: /staff/support/:number, one support ticket for staff (story S1-E11-13
 * criteria 3, 4, 5 and 12; bundle ADMIN-2h1).
 *
 * The messages with their writers and internal notes, a box to answer the person or add a note
 * they never see, and beside them: who is asking (age group only, the email behind "Show", the
 * under-16 banner), the ticket's fields and its history. Opening the page is logged; so is every
 * change, without the words. Plain components, no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout. What it calls: useStaffTicket.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { StaffTicket, StaffTicketMessage } from '../api/staffSupportTickets';
import { useStaffTicket } from '../hooks/useStaffSupport';
import { useSupportTranslation } from '../registerSupportTranslations';

import { RequesterPanel } from './RequesterPanel';
import { SupportReplyForm } from './SupportReplyForm';
import { TicketFieldsPanel } from './TicketFieldsPanel';
import { TicketHistory } from './TicketHistory';
import { TicketMessageList, type TicketMessageItem } from './TicketMessageList';

/**
 * The messages as staff see them: usernames, notes marked.
 *
 * @returns the items to draw
 */
function useMessageItems(messages: StaffTicketMessage[]): TicketMessageItem[] {
  const { t } = useSupportTranslation();
  return messages.map((message) => {
    const handle = message.authorHandle ?? '';
    if (message.kind === 'internal_note')
      return {
        author: t('staff.messages.note', { handle }),
        tone: 'note',
        body: message.body,
        at: message.at,
      };
    if (message.kind === 'staff_reply')
      return {
        author: t('staff.messages.teamBy', { handle }),
        tone: 'team',
        body: message.body,
        at: message.at,
      };
    const author =
      message.authorHandle === null
        ? t('staff.messages.emailSender')
        : t('staff.messages.member', { handle });
    return { author, tone: 'person', body: message.body, at: message.at };
  });
}

/**
 * The conversation column: messages and the reply box.
 *
 * @returns the column
 */
function Conversation({
  ticket,
  state,
}: {
  ticket: StaffTicket;
  state: ReturnType<typeof useStaffTicket>;
}) {
  const { t } = useSupportTranslation();
  const items = useMessageItems(ticket.messages);
  const isClosed = ticket.status === 'closed';
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TicketMessageList messages={items} label={t('staff.messages.label')} />
      {isClosed && <p className="m-0 text-body">{t('staff.reply.closed')}</p>}
      <SupportReplyForm
        id="staff-support-reply"
        label={t('staff.reply.label')}
        sendLabel={t('staff.reply.send')}
        noteLabel={t('staff.reply.addNote')}
        allowsReply={!isClosed}
        isBusy={state.isChanging}
        failure={state.failure}
        waitMinutes={state.waitMinutes}
        onSend={(body, isNote) => state.change({ kind: 'reply', body, isNote })}
      />
    </div>
  );
}

/**
 * The ticket, once loaded: the conversation beside the panels (stacked on a phone).
 *
 * @returns the page's body
 */
function LoadedTicket({
  ticket,
  state,
}: {
  ticket: StaffTicket;
  state: ReturnType<typeof useStaffTicket>;
}) {
  const { t } = useSupportTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[30px] font-bold break-words text-heading">
          {ticket.subject}
        </h1>
        <p className="m-0 text-sm text-meta">
          {t('staff.ticketMeta', {
            number: ticket.number,
            channel: t(`staff.channels.${ticket.channel}`),
          })}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Conversation ticket={ticket} state={state} />
        <div className="flex min-w-0 flex-col gap-6">
          <RequesterPanel
            requester={ticket.requester}
            revealedEmail={state.revealedEmail}
            revealFailed={state.revealFailed}
            onReveal={state.revealEmail}
          />
          <TicketFieldsPanel
            key={JSON.stringify([
              ticket.status,
              ticket.priority,
              ticket.category,
              ticket.assignedHandle,
              ticket.tags,
            ])}
            ticket={ticket}
            isBusy={state.isChanging}
            onSave={(changes) => state.change({ kind: 'fields', changes })}
          />
          <TicketHistory history={ticket.history} />
        </div>
      </div>
    </div>
  );
}

/**
 * The ticket, a wait, or why there is none.
 *
 * @returns the page's body
 */
function TicketBody({ state }: { state: ReturnType<typeof useStaffTicket> }) {
  const { t } = useSupportTranslation();
  if (state.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  if (state.ticket.isError) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (state.ticket.isPending) return null;
  if (state.ticket.data === null) return <p className="m-0 text-body">{t('staff.notFound')}</p>;
  return <LoadedTicket ticket={state.ticket.data} state={state} />;
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function StaffSupportTicketPage() {
  const { t } = useSupportTranslation();
  const ticketNumber = Number(useParams().number ?? '0');
  const state = useStaffTicket(ticketNumber);
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.documentTitle')}</title>
      <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
      <TicketBody state={state} />
      <Link to="/staff/support" className="w-fit text-sm font-semibold text-link underline">
        {t('staff.back')}
      </Link>
    </PageContainer>
  );
}
