/**
 * MySupportTicketPage: /support/:number, one of the person's support requests (story S1-E11-13;
 * bundle ADMIN-2h1).
 *
 * The messages ("You" and "The support team", never which person on the team, and never an
 * internal note), then a box to answer: answering a solved request, or one waiting for the
 * person, opens it again (criterion 7). A closed request says to ask again; one staff merged
 * into another links to it (part h4a, criterion 9). A number that isn't theirs reads as "not
 * found".
 * Who shows it: the router. What it calls: useMyTicket.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MyTicket } from '../api/supportTickets';
import { useMyTicket } from '../hooks/useMySupport';
import { useSupportTranslation } from '../registerSupportTranslations';

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
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.05] font-bold break-words text-heading">
          {ticket.subject}
        </h1>
        <p className="m-0 text-sm text-meta">
          {t('ticket.meta', { number: ticket.number, status: t(`statuses.${ticket.status}`) })}
        </p>
      </div>
      <TicketMessageList messages={items} label={t('ticket.messagesLabel')} />
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
      {ticket.status !== 'closed' && (
        <SupportReplyForm
          id="support-reply"
          label={t('ticket.replyLabel')}
          sendLabel={t('ticket.send')}
          isBusy={state.isReplying}
          failure={state.failure}
          waitMinutes={state.waitMinutes}
          onSend={(body) => state.reply(body)}
        />
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
    <PageContainer className="flex flex-col gap-6 pt-14 pb-16">
      <title>{t('ticket.documentTitle', { number: ticketNumber })}</title>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <TicketBody state={state} />
      <Link to="/support" className="w-fit text-sm font-semibold text-link underline">
        {t('back')}
      </Link>
    </PageContainer>
  );
}
