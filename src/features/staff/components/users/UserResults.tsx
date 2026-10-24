/**
 * UserResults: the Users search results (story S1-E11-02; board AdminUsers 8.5's results table):
 * account, status, age check, sanctions and open cases, each account a link to its page.
 * A table on wide screens and label-row cards on phones, as the audit log does (CLAUDE.md rule 21:
 * nothing scrolls sideways at 390 px).
 *
 * Who shows it: UsersPage. What it reads: the results from useUserLookup.
 * Support's role can't see sanctions or cases (architecture 1.8.3), so those cells say so.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { UserMatch } from '../../api/userManagement';

import { useAccountWords } from '../../hooks/useAccountWords';

/** The cells of one row, as text, in column order (the account cell is drawn as a link). */
function useCellsOf() {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  return (match: UserMatch) => [
    words.status(match.status),
    words.ageCheck(match.ageCheckResult, match.ageCheckedAt),
    match.sanctionKinds === null
      ? t('users.notForYourRole')
      : words.sanctionKinds(match.sanctionKinds),
    match.openCaseCount === null ? t('users.notForYourRole') : String(match.openCaseCount),
  ];
}

/**
 * The account cell: "@username" as a link to the account page, and the pen name under it.
 *
 * @returns the cell's content
 */
function AccountCell({ match }: { match: UserMatch }) {
  const { t } = useTranslation('staff');
  const name = match.handle === null ? t('shell.noHandle') : `@${match.handle}`;
  return (
    <span className="flex flex-col">
      <Link
        to={`/staff/users/${match.userId}`}
        className="font-semibold text-link underline"
        aria-label={t('users.openAccount', { name })}
      >
        {name}
      </Link>
      {match.penName !== null && <span className="text-sm text-meta">{match.penName}</span>}
    </span>
  );
}

/**
 * Renders the results.
 *
 * @param props.matches - the accounts found
 * @returns the table and the phone cards
 */
export function UserResults({ matches }: { matches: UserMatch[] }) {
  const { t } = useTranslation('staff');
  const cellsOf = useCellsOf();
  const headings = [
    t('users.columns.status'),
    t('users.columns.ageCheck'),
    t('users.columns.sanctions'),
    t('users.columns.openCases'),
  ];
  return (
    <>
      <table className="hidden w-full border-collapse text-sm lg:table">
        <caption className="sr-only">{t('users.resultsHeading')}</caption>
        <thead>
          <tr className="border-b border-border text-left text-meta">
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('users.columns.account')}
            </th>
            {headings.map((heading) => (
              <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.userId} className="border-b border-border align-top">
              <td className="py-2.5 pr-4">
                <AccountCell match={match} />
              </td>
              {cellsOf(match).map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
        {matches.map((match) => (
          <li key={match.userId} className="rounded-card border border-border bg-surface p-4">
            <AccountCell match={match} />
            <LabelRows
              rows={cellsOf(match).map((cell, index) => ({
                label: headings[index] ?? '',
                value: cell,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
