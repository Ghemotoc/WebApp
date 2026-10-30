/**
 * MyMailPage: /moderator-mail, a member's messages with the moderation team (story S1-E10-11;
 * DSA art. 12: one place to reach the moderators).
 *
 * The list of the person's threads (subject, reference, status, last activity) and "Write to the
 * moderators". Signed-out visitors are asked to log in; anyone without an account can still use
 * the public report form or Contact us.
 * Who shows it: the router. What it calls: useMyMail.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MailThreadSummary } from '../api/moderatorMail';
import { useMyMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

/**
 * One thread in the list.
 *
 * @returns a list item
 */
function ThreadRow({ thread }: { thread: MailThreadSummary }) {
  const { t, i18n } = useMailTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(thread.lastMessageAt),
  );
  return (
    <li className="flex flex-col gap-1 border-b border-border py-4 last:border-b-0">
      <Link
        to={`/moderator-mail/${thread.reference}`}
        className="font-semibold break-words text-link underline"
      >
        {thread.subject}
      </Link>
      <p className="m-0 text-sm text-meta">
        {t('list.meta', {
          reference: thread.reference,
          status: t(`statuses.${thread.status}`),
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
  const { t } = useMailTranslation();
  const mail = useMyMail(true);
  if (mail.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (mail.isPending) return null;
  if (mail.data.length === 0) return <p className="m-0 text-body">{t('list.empty')}</p>;
  return (
    <ul className="m-0 list-none rounded-card border border-border bg-surface px-6 py-1 shadow-card">
      {mail.data.map((thread) => (
        <ThreadRow key={thread.reference} thread={thread} />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MyMailPage() {
  const { t } = useMailTranslation();
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
      {isKnown && userId === null && (
        <p className="m-0 text-body">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && (
        <>
          <Link
            to="/moderator-mail/new"
            className="inline-flex h-11 w-fit items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
          >
            {t('list.write')}
          </Link>
          <SignedInList />
        </>
      )}
    </PageContainer>
  );
}
