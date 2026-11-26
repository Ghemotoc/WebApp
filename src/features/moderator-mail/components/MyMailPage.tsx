/**
 * MyMailPage: /moderator-mail, a member's messages with the moderation team (story S1-E10-11;
 * DSA art. 12: one place to reach the moderators; board ModMail in the liquid glass redesign,
 * bundle G8c; user stories bundle 10, board J22).
 *
 * Board J22: the trail "Settings / Moderator mail", the title and the lead with "Write to the
 * moderators" under them, the threads as rows straight on the page, then a note for people
 * without an account pointing to the public report form and Contact us. Signed-out visitors are
 * asked to log in.
 * Who shows it: the router; My reports and Settings link here.
 * What it calls: useMyMail, MailThreadRows.
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMyMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBreadcrumb } from './MailBreadcrumb';
import { MailThreadRows } from './MailThreadRows';

/**
 * The threads for a signed-in person.
 *
 * @returns the rows, a line when there are none, a wait or an error
 */
function SignedInList() {
  const { t } = useMailTranslation();
  const mail = useMyMail(true);
  if (mail.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (mail.isPending) return null;
  if (mail.data.length === 0) return <p className="m-0 text-ink-muted">{t('list.empty')}</p>;
  return <MailThreadRows threads={mail.data} />;
}

/**
 * The title and lead, with "Write to the moderators" under them for a signed-in person.
 *
 * @param props.isSignedIn - true to show the button
 * @returns the header
 */
function MailHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useMailTranslation();
  return (
    <header className="flex max-w-[720px] flex-col gap-4">
      <h1 className="page-title">{t('list.title')}</h1>
      <p className="m-0 type-long leading-relaxed text-ink-muted">{t('list.intro')}</p>
      {isSignedIn && (
        <Link
          to="/moderator-mail/new"
          className={buttonClassName({ variant: 'primary' }, 'mt-2 w-fit')}
        >
          {t('list.write')}
        </Link>
      )}
    </header>
  );
}

/**
 * The board's last line: where people without an account can go instead.
 *
 * @returns the note, with its two links
 */
function NoAccountNote() {
  const { t } = useMailTranslation();
  return (
    <p className="m-0 type-meta text-ink-muted">
      <Trans
        t={t}
        i18nKey="list.noAccount"
        components={{
          report: <Link to="/report" className="text-link underline" />,
          contact: <Link to="/contact" className="text-link underline" />,
        }}
      />
    </p>
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
  const isSignedIn = isKnown && userId !== null;
  return (
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('list.documentTitle')}</title>
      {isSignedIn && <MailBreadcrumb />}
      <MailHeader isSignedIn={isSignedIn} />
      {isKnown && userId === null && (
        <p className="m-0 text-ink-muted">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isSignedIn && <SignedInList />}
      <NoAccountNote />
    </PageContainer>
  );
}
