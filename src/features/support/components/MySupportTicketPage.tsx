/**
 * MySupportTicketPage: /support/:number, one of the person's support requests (story S1-E11-13;
 * bundle ADMIN-2h1).
 *
 * The messages ("You" and "The support team", never which person on the team, and never an
 * internal note), then a box to answer: answering a solved request, or one waiting for the
 * person, opens it again (criterion 7). A closed request says to ask again; one staff merged
 * into another links to it (part h4a, criterion 9). A number that isn't theirs reads as "not
 * found". Since user stories bundle 10 (board J21) the page opens with the trail "Settings /
 * Support requests / Request 2041", then the subject as the title with one meta line under it (the
 * state in bold, the request number, what it is about), the messages as blocks (the team's
 * tinted), and the answer box straight on the page with "Text only. Files can’t be sent here."
 * Who shows it: the router. What it calls: useMyTicket, ticketStatusPill.
 */
import { Link, useParams } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MyTicket } from '../api/supportTickets';
import { useMyTicket } from '../hooks/useMySupport';
import { ticketStatusPill } from '../lib/ticketStatusPill';
import { useSupportTranslation } from '../registerSupportTranslations';

import { SupportBreadcrumb } from './SupportBreadcrumb';
import { SupportReplyForm } from './SupportReplyForm';
import { TicketMessageList, type TicketMessageItem } from './TicketMessageList';

/**
 * The messages as the person sees them.
 *
 * @returns the items to draw
 */
function useMessageItems(ticket: MyTicket): TicketMessageItem[] {
  const { t } = useSupportTranslation();
  return ticket.messages.map((message) => ({
    author: message.fromTeam ? t('ticket.team') : t('ticket.you'),
    tone: message.fromTeam ? 'team' : 'person',
    body: message.body,
    at: message.at,
  }));
}

/**
 * The ticket, once loaded.
 *
 * @returns the ticket's body
 */
function LoadedTicket({
  ticket,
  state,
}: {
  ticket: MyTicket;
  state: ReturnType<typeof useMyTicket>;
}) {
  const { t } = useSupportTranslation();
  const items = useMessageItems(ticket);
  const lastFromTeam = ticket.messages.at(-1)?.fromTeam ?? false;
  const pill = ticketStatusPill(ticket.status, lastFromTeam);
  return (
    <div className="flex max-w-[760px] flex-col gap-8">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="m-0 type-title break-words text-ink-heading lg:type-display">
          {ticket.subject}
        </h1>
        <MetaLine
          facts={[
            { text: t(`list.states.${pill.state}`), kind: 'state' },
            { text: t('list.requestNumber', { number: ticket.number }) },
            { text: t(`categories.${ticket.category}`) },
          ]}
        />
      </header>
      <TicketMessageList messages={items} label={t('ticket.messagesLabel')} layout="blocks" />
      {ticket.mergedInto !== null && (
        <p className="m-0 text-ink-muted">
          <Link to={`/support/${String(ticket.mergedInto)}`}>
            {t('ticket.mergedInto', { number: ticket.mergedInto })}
          </Link>
        </p>
      )}
      {ticket.status === 'closed' && ticket.mergedInto === null && (
        <p className="m-0 text-ink-muted">{t('ticket.closed', { number: ticket.number })}</p>
      )}
      {ticket.status !== 'closed' && <ReplyCard ticket={ticket} state={state} />}
    </div>
  );
}

/**
 * The answer box, with the line that says answering opens a solved request.
 *
 * @returns the box and the line
 */
function ReplyCard({ ticket, state }: { ticket: MyTicket; state: ReturnType<typeof useMyTicket> }) {
  const { t } = useSupportTranslation();
  return (
    <div className="flex flex-col gap-3">
      <SupportReplyForm
        id="support-reply"
        label={t('ticket.replyLabel')}
        hint={t('ticket.replyHint')}
        sendLabel={t('ticket.send')}
        isBusy={state.isReplying}
        failure={state.failure}
        waitMinutes={state.waitMinutes}
        onSend={(body) => state.reply(body)}
      />
      {ticket.status === 'solved' && (
        <p className="m-0 type-body text-ink-muted">{t('ticket.reopenNote')}</p>
      )}
    </div>
  );
}

/**
 * The ticket, a wait, or why there is none.
 *
 * @returns the page's body
 */
function TicketBody({ state }: { state: ReturnType<typeof useMyTicket> }) {
  const { t } = useSupportTranslation();
  if (state.ticket.isError) return <Notice tone="error">{t('ticket.loadFailed')}</Notice>;
  if (state.ticket.isPending) return null;
  if (state.ticket.data === null)
    return <p className="m-0 text-ink-muted">{t('ticket.notFound')}</p>;
  return <LoadedTicket ticket={state.ticket.data} state={state} />;
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MySupportTicketPage() {
  const { t } = useSupportTranslation();
  const ticketNumber = Number(useParams().number ?? '0');
  const state = useMyTicket(ticketNumber);
  return (
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('ticket.documentTitle', { number: ticketNumber })}</title>
      <SupportBreadcrumb current={t('list.requestNumber', { number: ticketNumber })} />
      <TicketBody state={state} />
    </PageContainer>
  );
}
