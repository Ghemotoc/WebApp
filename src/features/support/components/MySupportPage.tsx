/**
 * MySupportPage: /support, "Support requests" (story S1-E11-13 criterion 2; bundle ADMIN-2h1;
 * the liquid glass look of the canvas's Support board, bundle G11c).
 *
 * A link back to Settings, the heading with "Ask for help" beside it, then the person's tickets
 * as a table in a glass card (subject and request number, a status pill, the last update) and a
 * card that sends anyone who wants to report something to the report form instead. Signed-out
 * visitors are asked to log in, or to use Contact us. No doodles: it is a help screen read with
 * care.
 * Who shows it: the router; Settings links here. What it calls: useMyTickets, ticketStatusPill.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyTicketSummary } from '../api/supportTickets';
import { useMyTickets } from '../hooks/useMySupport';
import { ticketStatusPill } from '../lib/ticketStatusPill';
import { useSupportTranslation } from '../registerSupportTranslations';

import { ReportInsteadCard } from './ReportInsteadCard';
import { SignedOutLine } from './SignedOutLine';
import { SupportBackLink } from './SupportBackLink';

/**
 * One ticket in the table.
 *
 * @returns a table row
 */
function TicketRow({ ticket }: { ticket: MyTicketSummary }) {
  const { t, i18n } = useSupportTranslation();
  // Step 1: the last update in the reader's language, day and time.
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ticket.lastMessageAt));
  // Step 2: the words and colour of the status pill.
  const pill = ticketStatusPill(ticket.status, ticket.teamRepliedLast);
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3.5 align-top">
        <Link
          to={`/support/${String(ticket.number)}`}
          className="font-bold break-words text-link underline"
        >
          {ticket.subject}
        </Link>
        <div className="text-[13px] text-meta">
          {t('list.requestNumber', { number: ticket.number })}
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <InfoPill tone={pill.tone}>{t(`list.states.${pill.state}`)}</InfoPill>
      </td>
      <td className="px-4 py-3.5 align-top text-sm text-body">{when}</td>
    </tr>
  );
}

/**
 * The table for a signed-in person.
 *
 * @returns the table, a wait or an error
 */
function SignedInList() {
  const { t } = useSupportTranslation();
  const tickets = useMyTickets(true);
  if (tickets.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (tickets.isPending) return null;
  if (tickets.data.length === 0) return <p className="m-0 text-body">{t('list.empty')}</p>;
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface p-2 shadow-card">
      <table aria-label={t('list.title')} className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-[13px] text-meta">
            <th scope="col" className="px-4 py-2.5 font-semibold">
              {t('list.columns.subject')}
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              {t('list.columns.status')}
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              {t('list.columns.lastUpdate')}
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.data.map((ticket) => (
            <TicketRow key={ticket.number} ticket={ticket} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The heading row: the eyebrow, title and intro, with "Ask for help" beside them once signed in.
 *
 * @returns the header
 */
function SupportHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useSupportTranslation();
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-[720px] flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('list.title')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('list.intro')}</p>
      </div>
      {isSignedIn && (
        <Link
          to="/support/new"
          className="inline-flex h-11 w-fit items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
        >
          {t('list.write')}
        </Link>
      )}
    </header>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MySupportPage() {
  const { t } = useSupportTranslation();
  const { userId, isKnown } = useSession();
  const isSignedIn = isKnown && userId !== null;
  return (
    <PageContainer className="flex flex-col gap-6 pt-8 pb-16">
      <title>{t('list.documentTitle')}</title>
      {isSignedIn && <SupportBackLink to="/settings#support" label={t('list.backToSettings')} />}
      <SupportHeader isSignedIn={isSignedIn} />
      {isKnown && userId === null && <SignedOutLine />}
      {isSignedIn && <SignedInList />}
      <ReportInsteadCard />
    </PageContainer>
  );
}
