/**
 * AccountPage: /staff/users/:userId, one account in the admin site (story S1-E11-02; board
 * AdminUsers 8.5's account panel; architecture 1.8.4: "Users").
 *
 * What it shows, top to bottom: the username and pen name; the label rows (short user ID with
 * Copy, status, masked email with "Show (logged)", age group and age check, roles); the Actions
 * panel (owner, admin, moderator); "Ask for a change" to the person's forum signature (S1-E8-08,
 * moderation staff); the sanctions history with Lift; the open cases; the staff notes (every
 * staff member who may open the account, LOGS-1a); every staff action on the account, paged
 * (owner and admin, LOGS-1b); and the private messages line. Each part shows only for a role
 * that may see it (architecture 1.8.3), and the database checks every one again.
 * Private messages (story criterion 3): this page reads no message, ever; a moderator sees one
 * only on the case page of a report it belongs to (S1-E9, after March).
 * Who shows it: the router, inside StaffLayout. What it calls: useAccount and useAccountActions.
 * Plain components, no doodles (DoD: staff screens).
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { CustomisationChangeForm } from '@/features/forums/components/CustomisationChangeForm';
import { AccountSanctions } from '@/features/moderation/components/AccountSanctions';
import { registerModerationTranslations } from '@/features/moderation/registerModerationTranslations';

import { useAccount } from '../../hooks/useAccount';
import { useAccountActions } from '../../hooks/useAccountActions';

import { AccountActions } from './AccountActions';
import { AccountNotes } from './AccountNotes';
import { AccountOpenCases } from './AccountOpenCases';
import { AccountStaffHistory } from './AccountStaffHistory';
import { AccountSummaryRows } from './AccountSummaryRows';

/** useAccount's result, passed down once. */
type Account = ReturnType<typeof useAccount>;

/**
 * Everything under the heading, once the account is known.
 *
 * @returns the account's sections
 */
function AccountSections({ account, userId }: { account: Account; userId: string }) {
  const { t } = useTranslation('staff');
  const actions = useAccountActions(userId, account.refresh);
  const summary = account.account;
  if (summary === null) return null;
  const handle = summary.handle ?? t('shell.noHandle');
  return (
    <>
      <AccountSummaryRows summary={summary} account={account} />
      {summary.mayAct && <AccountActions summary={summary} actions={actions} />}
      {summary.handle !== null && (
        <CustomisationChangeForm item="signature" reference={summary.handle} />
      )}
      {summary.mayViewSanctions && (
        <AccountSanctions
          heading={t('users.sanctionsHeading')}
          sanctions={{ ...actions, sanctions: account.sanctions }}
        />
      )}
      {account.openCases !== null && <AccountOpenCases cases={account.openCases} />}
      <AccountNotes userId={userId} />
      {summary.mayReadAuditLog && <AccountStaffHistory userId={userId} handle={handle} />}
      <section aria-labelledby="account-messages-heading" className="flex flex-col gap-2">
        <h2
          id="account-messages-heading"
          className="m-0 font-heading text-[24px] font-bold text-heading"
        >
          {t('users.messages.heading')}
        </h2>
        <p className="m-0 text-body">{t('users.messages.text')}</p>
      </section>
    </>
  );
}

/**
 * The heading: "@username", with the pen name under it.
 *
 * @returns the heading block
 */
function AccountHeading({ account }: { account: Account }) {
  const { t } = useTranslation('staff');
  const summary = account.account;
  const name = summary?.handle == null ? t('shell.noHandle') : `@${summary.handle}`;
  return (
    <div className="flex max-w-[720px] flex-col gap-2">
      <Link to="/staff/users" className="text-sm font-semibold text-link underline">
        {t('users.account.back')}
      </Link>
      <Eyebrow>{t('users.account.eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[34px] font-bold break-words text-heading">
        {summary === null ? t('users.account.loading') : name}
      </h1>
      {summary?.penName != null && <p className="m-0 text-body">{summary.penName}</p>}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the account screen
 */
export function AccountPage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('staff');
  const { userId = '' } = useParams();
  const account = useAccount(userId);
  const failure = account.failure;
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('users.account.documentTitle', { handle: account.account?.handle ?? '' })}</title>
      <AccountHeading account={account} />
      <div className="flex max-w-[860px] flex-col gap-8">
        {failure === 'not_allowed' && <p className="m-0 text-body">{t('users.notAllowed')}</p>}
        {failure !== null && failure !== 'not_allowed' && (
          <Notice tone="error">{t(`users.failures.${failure}`)}</Notice>
        )}
        <AccountSections account={account} userId={userId} />
      </div>
    </PageContainer>
  );
}
