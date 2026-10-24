/**
 * AccountSummaryRows: the account page's label rows (story S1-E11-02; board AdminUsers 8.5's
 * account panel): user ID (short, with Copy), pen name, joined, status, email (masked, with
 * "Show (logged)"), age group, age check and staff roles.
 *
 * Who shows it: AccountPage. What it reads: useAccount's summary and showEmail().
 * Least privilege (architecture 1.8.3): the age group and the age check result and date only,
 * never the year of birth; the email stays masked until "Show", which the database logs; the
 * button shows only for roles that may use it.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';

import type { AccountSummary } from '../../api/userManagement';
import { useAccountWords } from '../../hooks/useAccountWords';
import type { useAccount } from '../../hooks/useAccount';

import { ShortUserId } from './ShortUserId';

/** useAccount's result, passed down once. */
type Account = ReturnType<typeof useAccount>;

/**
 * The email row: the masked address and "Show (logged)", or the address once shown.
 *
 * @returns the row's value
 */
function EmailValue({ summary, account }: { summary: AccountSummary; account: Account }) {
  const { t } = useTranslation('staff');
  if (account.shownEmail !== null) return <span>{account.shownEmail}</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{summary.emailMasked ?? t('users.account.noEmail')}</span>
      {summary.mayRevealEmail && summary.emailMasked !== null && (
        <Button variant="secondary" disabled={account.isShowingEmail} onClick={account.showEmail}>
          {t('users.account.showEmail')}
        </Button>
      )}
      {account.emailFailed && (
        <span role="alert" className="text-sm text-destructive">
          {t('users.account.emailFailed')}
        </span>
      )}
    </span>
  );
}

/**
 * Renders the rows.
 *
 * @param props.summary - the account
 * @param props.account - useAccount's result, for "Show email"
 * @returns the label rows
 */
export function AccountSummaryRows({
  summary,
  account,
}: {
  summary: AccountSummary;
  account: Account;
}) {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  const roles = summary.staffRoles.map((role) => t(`roleNames.${role}`)).join(', ');
  return (
    <LabelRows
      rows={[
        { label: t('users.account.userId'), value: <ShortUserId userId={summary.userId} /> },
        {
          label: t('users.account.penName'),
          value: summary.penName ?? t('users.account.noPenName'),
        },
        { label: t('users.account.joined'), value: words.date(summary.joinedAt) },
        { label: t('users.account.status'), value: words.status(summary.status) },
        {
          label: t('users.account.email'),
          value: <EmailValue summary={summary} account={account} />,
        },
        { label: t('users.account.ageBand'), value: words.ageBand(summary.ageBand) },
        {
          label: t('users.account.ageCheck'),
          value: words.ageCheck(summary.ageCheckResult, summary.ageCheckedAt),
        },
        {
          label: t('users.account.roles'),
          value: roles === '' ? t('users.account.noRole') : roles,
        },
      ]}
    />
  );
}
