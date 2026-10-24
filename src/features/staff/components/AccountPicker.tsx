/**
 * AccountPicker: "Find the account" on /staff/roles: a search box for a username, a pen name or a
 * whole email address, then the accounts to pick from (story S1-E11-01b; Robert's request of
 * 24 Oct 2026: grant a role to an account that exists, not to a typed identifier).
 *
 * The search runs on the Search button or Enter (Enter never submits the grant form). The picked
 * account goes up to GrantRoleForm, which grants by user ID. Plain components, no doodles.
 * Who shows it: GrantRoleForm. What it calls: useAccountSearch → api/accountSearch.ts.
 */
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { AccountMatch } from '../api/accountSearch';
import { useAccountSearch } from '../hooks/useAccountSearch';

import { AccountResults } from './AccountResults';

/** What the picker needs. */
interface AccountPickerProps {
  picked: AccountMatch | null;
  onPick: (account: AccountMatch | null) => void;
  errorMessage?: string;
}

/**
 * Renders the picker.
 *
 * @returns the search field, its button and the results
 */
export function AccountPicker({ picked, onPick, errorMessage }: AccountPickerProps) {
  const { t } = useTranslation('staff');
  const search = useAccountSearch();
  const [searchText, setSearchText] = useState('');

  /** Starts a new search and forgets the account picked from the last one. */
  function runSearch() {
    onPick(null);
    search.search(searchText);
  }

  /** Enter in the search box searches instead of submitting the grant form. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    runSearch();
  }

  return (
    <div className="flex flex-col gap-3">
      <TextInput
        id="grant-account-search"
        type="search"
        label={t('roles.findAccount')}
        hint={t('roles.findAccountHint')}
        errorMessage={errorMessage}
        value={searchText}
        autoCapitalize="none"
        onChange={(event) => setSearchText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        variant="secondary"
        className="self-start"
        onClick={runSearch}
        disabled={search.isSearching}
      >
        {t('roles.search')}
      </Button>
      <AccountResults search={search} picked={picked} onPick={onPick} />
    </div>
  );
}
