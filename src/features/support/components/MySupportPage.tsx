/**
 * MySupportPage: /support, "Support requests" (story S1-E11-13 criterion 2; bundle
 * ADMIN-2h1).
 *
 * The person's tickets (subject, number, status, last activity, and "We answered" when the team
 * wrote last) and "Ask for help". Signed-out visitors are asked to log in, or to use Contact us.
 * No doodles: it is a help screen read with care.
 * Who shows it: the router; Settings links here. What it calls: useMyTickets.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyTicketSummary } from '../api/supportTickets';
import { useMyTickets } from '../hooks/useMySupport';
import { useSupportTranslation } from '../registerSupportTranslations';

import { SignedOutLine } from './SignedOutLine';

/**
 * One ticket in the list.
 *
 * @returns a list item
 */
function TicketRow({ ticket }: { ticket: MyTicketSummary }) {
  const { t, i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(ticket.lastMessageAt),
  );
  return (
    <li className="flex flex-col gap-1 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/support/${String(ticket.number)}`}
          className="font-semibold break-words text-link underline"
        >
          {ticket.subject}
        </Link>
        {ticket.teamRepliedLast && <InfoPill tone="sage">{t('list.answered')}</InfoPill>}
      </div>
      <p className="m-0 text-sm text-meta">
        {t('list.meta', {
          number: ticket.number,
          status: t(`statuses.${ticket.status}`),
          date: when,
        })}
      </p>
    </li>
  );
}

/**
 * The list for a signed-in person.
 *
 * @returns the list, a wait or an error
 */
function SignedInList() {
  const { t } = useSupportTranslation();
  const tickets = useMyTickets(true);
  if (tickets.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (tickets.isPending) return null;
  if (tickets.data.length === 0) return <p className="m-0 text-body">{t('list.empty')}</p>;
  return (
    <ul className="m-0 list-none rounded-card border border-border bg-surface px-6 py-1 shadow-card">
      {tickets.data.map((ticket) => (
        <TicketRow key={ticket.number} ticket={ticket} />
      ))}
    </ul>
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
  return (
    <PageContainer className="flex flex-col gap-6 pb-16">
      <title>{t('list.documentTitle')}</title>
      <header className="flex max-w-[720px] flex-col gap-4 pt-14">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('list.title')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('list.intro')}</p>
      </header>
      {isKnown && userId === null && <SignedOutLine />}
      {isKnown && userId !== null && (
        <>
          <Link
            to="/support/new"
            className="inline-flex h-11 w-fit items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
          >
            {t('list.write')}
          </Link>
          <SignedInList />
        </>
      )}
    </PageContainer>
  );
}
