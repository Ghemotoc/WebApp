/**
 * MyMailPage: /moderator-mail, a member's messages with the moderation team (story S1-E10-11;
 * DSA art. 12: one place to reach the moderators; board ModMail in the liquid glass redesign,
 * bundle G8c).
 *
 * As the board draws it: "Settings" to go back, the eyebrow, the title and the lead on the left
 * with "Write to the moderators" as the main pill on the right, the threads as one glass table,
 * then a note for people without an account pointing to the public report form and Contact us.
 * Signed-out visitors are asked to log in.
 * Who shows it: the router; My reports and Settings link here.
 * What it calls: useMyMail, MailThreadTable.
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMyMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBackLink } from './MailBackLink';
import { MailThreadTable } from './MailThreadTable';

/**
 * The threads for a signed-in person.
 *
 * @returns the table, a line when there are none, a wait or an error
 */
function SignedInList() {
  const { t } = useMailTranslation();
  const mail = useMyMail(true);
  if (mail.isError) return <Notice tone="error">{t('list.loadFailed')}</Notice>;
  if (mail.isPending) return null;
  if (mail.data.length === 0) return <p className="m-0 text-body">{t('list.empty')}</p>;
  return <MailThreadTable threads={mail.data} />;
}

/**
 * The title and lead, with "Write to the moderators" on the right for a signed-in person.
 *
 * @param props.isSignedIn - true to show the pill
 * @returns the header
 */
function MailHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useMailTranslation();
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="page-title">{t('list.title')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('list.intro')}</p>
      </div>
      {isSignedIn && (
        <Link
          to="/moderator-mail/new"
          className={buttonClassName({ variant: 'primary' }, 'w-fit shrink-0')}
        >
          <ActionIcon name="plus" size={16} />
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
    <p className="m-0 text-sm text-meta">
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
    <PageContainer className="flex flex-col gap-6 pt-10 pb-16">
      <title>{t('list.documentTitle')}</title>
      <MailBackLink to="/settings" label={t('list.settings')} />
      <MailHeader isSignedIn={isSignedIn} />
      {isKnown && userId === null && (
        <p className="m-0 text-body">
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
