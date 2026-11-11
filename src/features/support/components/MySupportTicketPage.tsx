/**
 * MySupportTicketPage: /support/:number, one of the person's support requests (story S1-E11-13;
 * bundle ADMIN-2h1).
 *
 * The messages ("You" and "The support team", never which person on the team, and never an
 * internal note), then a box to answer: answering a solved request, or one waiting for the
 * person, opens it again (criterion 7). A closed request says to ask again; one staff merged
 * into another links to it (part h4a, criterion 9). A number that isn't theirs reads as "not
 * found". In the liquid glass look (bundle G11c, the canvas's SupportRequest board) the page opens
 * with a link back to the list, the request number above the subject and a status pill beside it,
 * then the messages as a chat and the answer box in a glass card.
 * Who shows it: the router. What it calls: useMyTicket, ticketStatusPill.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MyTicket } from '../api/supportTickets';
import { useMyTicket } from '../hooks/useMySupport';
import { ticketStatusPill } from '../lib/ticketStatusPill';
import { useSupportTranslation } from '../registerSupportTranslations';

import { SupportBackLink } from './SupportBackLink';
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
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow>{t('list.requestNumber', { number: ticket.number })}</Eyebrow>
          <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.05] font-bold break-words text-heading">
            {ticket.subject}
          </h1>
        </div>
        <InfoPill tone={pill.tone}>{t(`list.states.${pill.state}`)}</InfoPill>
      </div>
      <TicketMessageList messages={items} label={t('ticket.messagesLabel')} layout="chat" />
      {ticket.mergedInto !== null && (
        <p className="m-0 text-body">
          <Link to={`/support/${String(ticket.mergedInto)}`}>
            {t('ticket.mergedInto', { number: ticket.mergedInto })}
          </Link>
        </p>
      )}
      {ticket.status === 'closed' && ticket.mergedInto === null && (
        <p className="m-0 text-body">{t('ticket.closed', { number: ticket.number })}</p>
      )}
      {ticket.status !== 'closed' && <ReplyCard ticket={ticket} state={state} />}
    </div>
  );
}

/**
 * The answer box in its glass card, with the line that says answering opens a solved request.
 *
 * @returns the card
 */
function ReplyCard({ ticket, state }: { ticket: MyTicket; state: ReturnType<typeof useMyTicket> }) {
  const { t } = useSupportTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <SupportReplyForm
          id="support-reply"
          label={t('ticket.replyLabel')}
          sendLabel={t('ticket.send')}
          isBusy={state.isReplying}
          failure={state.failure}
          waitMinutes={state.waitMinutes}
          onSend={(body) => state.reply(body)}
        />
      </div>
      {ticket.status === 'solved' && (
        <p className="m-0 text-sm text-meta">{t('ticket.reopenNote')}</p>
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
  if (state.ticket.data === null) return <p className="m-0 text-body">{t('ticket.notFound')}</p>;
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
    <PageContainer className="flex flex-col gap-6 pt-8 pb-16">
      <title>{t('ticket.documentTitle', { number: ticketNumber })}</title>
      <SupportBackLink to="/support" label={t('list.title')} />
      <TicketBody state={state} />
    </PageContainer>
  );
}
