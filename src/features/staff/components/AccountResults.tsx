/**
 * AccountResults: what the account search found, or why there is nothing to pick (story
 * S1-E11-01b).
 *
 * The status line is a live region, so a screen reader hears "3 accounts found" or "No account
 * matches" without moving focus. Who shows it: AccountPicker.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { AccountMatch } from '../api/accountSearch';
import type { useAccountSearch } from '../hooks/useAccountSearch';

import { AccountOption } from './AccountOption';

/** What the results need. */
interface AccountResultsProps {
  search: ReturnType<typeof useAccountSearch>;
  picked: AccountMatch | null;
  onPick: (account: AccountMatch) => void;
}

/**
 * The status line's words for the current search.
 *
 * @returns the line, or null before the first search
 */
function useStatusLine(search: AccountResultsProps['search']): string | null {
  const { t } = useTranslation('staff');
  if (!search.hasSearched) return null;
  if (search.isTooShort) return t('roles.searchTooShort');
  if (search.isSearching) return t('roles.searching');
  if (search.searchFailure !== null) return null;
  if (search.results.length === 0) return t('roles.noAccounts');
  return t('roles.accountsFound', { count: search.results.length });
}

/**
 * Renders the results.
 *
 * @returns the status line, a failure notice, and the radios to pick from
 */
export function AccountResults({ search, picked, onPick }: AccountResultsProps) {
  const { t } = useTranslation('staff');
  const statusLine = useStatusLine(search);
  const failure = search.searchFailure ?? search.revealFailure;

  return (
    <>
      <p role="status" className="m-0 text-sm text-meta">
        {statusLine}
      </p>
      {failure !== null && <Notice tone="error">{t(`roles.failures.${failure}`)}</Notice>}
      {search.results.length > 0 && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold text-ink">{t('roles.pickAccount')}</legend>
          <ul className="m-0 list-none p-0">
            {search.results.map((account) => (
              <AccountOption
                key={account.userId}
                account={account}
                isPicked={picked?.userId === account.userId}
                shownEmail={search.shownEmails[account.userId]}
                onPick={onPick}
                onRevealEmail={search.revealEmail}
              />
            ))}
          </ul>
        </fieldset>
      )}
    </>
  );
}
