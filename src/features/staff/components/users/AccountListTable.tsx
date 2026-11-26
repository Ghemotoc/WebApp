/**
 * AccountListTable: the rows of the full account list in Staff › Users (Robert, 26 Nov 2026).
 * A table on wide screens and label-row cards on phones, as UserResults does (CLAUDE.md rule 21:
 * nothing scrolls sideways at 390 px). Kept thin on purpose: it only draws what it is given, so
 * the staff redesign (STAFF-4, story S1-E11-47) can rehouse it in the list-with-side-panel
 * pattern without touching the data side.
 *
 * Who shows it: AccountList. What it reads: the accounts and shown emails from useAccountList.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';
import { countryName } from '@/features/discovery/lib/countryNames';

import type { ListedAccount } from '../../api/accountList';

import { useAccountWords } from '../../hooks/useAccountWords';

import { AccountListEmail } from './AccountListEmail';

/** What the table needs. */
interface AccountListTableProps {
  accounts: ListedAccount[];
  shownEmails: Record<string, string>;
  onShowEmail: (userId: string) => void;
}

/** What the table and the cards share: the rows and how to draw one email cell. */
interface RowsProps {
  accounts: ListedAccount[];
  emailOf: (account: ListedAccount) => ReactNode;
}

/**
 * The account cell: the pen name over "@username", the username a link to the account page.
 *
 * @returns the cell's content
 */
function AccountCell({ account }: { account: ListedAccount }) {
  const { t } = useTranslation('staff');
  const name = account.handle === null ? t('shell.noHandle') : `@${account.handle}`;
  return (
    <span className="flex flex-col">
      {account.penName !== null && (
        <span className="font-semibold text-ink">{account.penName}</span>
      )}
      <Link
        to={`/staff/users/${account.userId}`}
        className="text-link underline"
        aria-label={t('users.openAccount', { name })}
      >
        {name}
      </Link>
    </span>
  );
}

/**
 * The status cell: the account status, and any sanctions under it in the warning colour.
 *
 * @returns the cell's content
 */
function StatusCell({ account }: { account: ListedAccount }) {
  const words = useAccountWords();
  return (
    <span className="flex flex-col">
      <span>{words.status(account.status)}</span>
      {account.sanctionKinds.length > 0 && (
        <span className="text-(--warning-text)">{words.sanctionKinds(account.sanctionKinds)}</span>
      )}
    </span>
  );
}

/**
 * The plain-text cells of one row, in column order after the account and email cells.
 *
 * @returns a function from an account to its cells
 */
function usePlainCells() {
  const { t, i18n } = useTranslation('staff');
  const words = useAccountWords();
  return (account: ListedAccount) => [
    account.countryCode === null
      ? t('users.list.noCountry')
      : countryName(account.countryCode, i18n.language),
    words.ageBand(account.ageBand),
    words.date(account.joinedAt),
    account.lastUsedOn === null ? t('users.list.neverUsed') : words.date(account.lastUsedOn),
  ];
}

/** The column headings after the account and email columns, and the cells under them. */
function useColumns() {
  const { t } = useTranslation('staff');
  return {
    plainHeadings: [
      t('users.list.columns.country'),
      t('users.list.columns.ageGroup'),
      t('users.list.columns.joined'),
      t('users.list.columns.lastUsed'),
    ],
    plainCells: usePlainCells(),
  };
}

/**
 * The table, from 1024 px.
 *
 * @returns the table
 */
function WideTable({ accounts, emailOf }: RowsProps) {
  const { t } = useTranslation('staff');
  const { plainHeadings, plainCells } = useColumns();
  const headingClass = 'py-2 pr-4 font-semibold';
  return (
    <table className="hidden w-full border-collapse text-sm lg:table">
      <caption className="sr-only">{t('users.list.heading')}</caption>
      <thead>
        <tr className="border-b border-border text-left text-meta">
          <th scope="col" className={headingClass}>
            {t('users.columns.account')}
          </th>
          <th scope="col" className={headingClass}>
            {t('users.list.columns.email')}
          </th>
          {plainHeadings.map((heading) => (
            <th key={heading} scope="col" className={headingClass}>
              {heading}
            </th>
          ))}
          <th scope="col" className={headingClass}>
            {t('users.columns.status')}
          </th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.userId} className="border-b border-border align-top">
            <td className="py-2.5 pr-4">
              <AccountCell account={account} />
            </td>
            <td className="py-2.5 pr-4">{emailOf(account)}</td>
            {plainCells(account).map((cell, index) => (
              <td key={plainHeadings[index]} className="py-2.5 pr-4">
                {cell}
              </td>
            ))}
            <td className="py-2.5 pr-4">
              <StatusCell account={account} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The label-row cards, under 1024 px.
 *
 * @returns the list of cards
 */
function PhoneCards({ accounts, emailOf }: RowsProps) {
  const { t } = useTranslation('staff');
  const { plainHeadings, plainCells } = useColumns();
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
      {accounts.map((account) => (
        <li key={account.userId} className="rounded-card border border-border bg-surface p-4">
          <AccountCell account={account} />
          <LabelRows
            rows={[
              { label: t('users.list.columns.email'), value: emailOf(account) },
              ...plainCells(account).map((cell, index) => ({
                label: plainHeadings[index] ?? '',
                value: cell,
              })),
              { label: t('users.columns.status'), value: <StatusCell account={account} /> },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the rows.
 *
 * @returns the table and the phone cards
 */
export function AccountListTable({ accounts, shownEmails, onShowEmail }: AccountListTableProps) {
  const emailOf = (account: ListedAccount) => (
    <AccountListEmail
      account={account}
      shownEmail={shownEmails[account.userId]}
      onShow={onShowEmail}
    />
  );
  return (
    <>
      <WideTable accounts={accounts} emailOf={emailOf} />
      <PhoneCards accounts={accounts} emailOf={emailOf} />
    </>
  );
}
