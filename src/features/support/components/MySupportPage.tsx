/**
 * MySupportPage: /support, "Support requests" (story S1-E11-13 criterion 2; bundle ADMIN-2h1;
 * user stories bundle 10, board J15).
 *
 * Board J15: the trail "Settings / Support requests", the title and intro, "Ask for help" under
 * them, then the person's requests as rows straight on the page (the subject, then one meta line:
 * the state in bold, the request number and the last update), with "To report a story…" beside
 * them, which sends anyone who wants to report something to the report form instead. Signed-out
 * visitors are asked to log in, or to use Contact us.
 * Who shows it: the router; Settings links here. What it calls: useMyTickets, ticketStatusPill,
 * dayAndTime.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { dayAndTime } from '@/lib/dayAndTime';

import type { MyTicketSummary } from '../api/supportTickets';
import { useMyTickets } from '../hooks/useMySupport';
import { ticketStatusPill } from '../lib/ticketStatusPill';
import { useSupportTranslation } from '../registerSupportTranslations';

import { ReportInsteadCard } from './ReportInsteadCard';
import { SignedOutLine } from './SignedOutLine';
import { SupportBreadcrumb } from './SupportBreadcrumb';

/**
 * One request in the list: its subject as the link, then its state, number and last update.
 *
 * @returns a list item
 */
function TicketRow({ ticket }: { ticket: MyTicketSummary }) {
  const { t, i18n } = useSupportTranslation();
  // Step 1: the state in words ("We answered" when the team wrote last).
  const pill = ticketStatusPill(ticket.status, ticket.teamRepliedLast);
  return (
    <li className="flex flex-col gap-1 border-b border-hairline py-4">
      <Link
        to={`/support/${String(ticket.number)}`}
        className="w-fit font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {ticket.subject}
      </Link>
      {/* Step 2: the meta line, the state first and bold. */}
      <MetaLine
        facts={[
          { text: t(`list.states.${pill.state}`), kind: 'state' },
          { text: t('list.requestNumber', { number: ticket.number }) },
          { text: dayAndTime(ticket.lastMessageAt, i18n.language) },
        ]}
      />
    </li>
  );
}

/**
 * The requests of a signed-in person.
 *
 * @returns the list, a wait or an error
 */
function SignedInList() {
  const { t } = useSupportTranslation();
  const tickets = useMyTickets(true);
  if (tickets.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (tickets.isPending) return null;
  if (tickets.data.length === 0) return <p className="m-0 text-ink-muted">{t('list.empty')}</p>;
  return (
    <ul aria-label={t('list.title')} className="m-0 list-none border-t border-hairline p-0">
      {tickets.data.map((ticket) => (
        <TicketRow key={ticket.number} ticket={ticket} />
      ))}
    </ul>
  );
}

/**
 * The title and intro, with "Ask for help" under them once signed in.
 *
 * @returns the header
 */
function SupportHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useSupportTranslation();
  return (
    <header className="flex max-w-[720px] flex-col gap-4">
      <h1 className="m-0 type-title lg:type-display">{t('list.title')}</h1>
      <p className="m-0 type-long leading-relaxed text-ink-muted">{t('list.intro')}</p>
      {isSignedIn && (
        <Link
          to="/support/new"
          className="mt-2 inline-flex h-11 w-fit items-center rounded-full button-main px-4 type-body font-semibold no-underline"
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
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('list.documentTitle')}</title>
      {isSignedIn && <SupportBreadcrumb />}
      <SupportHeader isSignedIn={isSignedIn} />
      {isKnown && userId === null && <SignedOutLine />}
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col">
          {isSignedIn && <SignedInList />}
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col">
          <ReportInsteadCard />
        </div>
      </div>
    </PageContainer>
  );
}
