/**
 * DataRequestPersonPicker: "Find the person" on the new data request form: a search box, then the
 * accounts found as radio buttons (bundle ADMIN-2, part c1; story S1-E11-09 criterion 1: find the
 * user by user ID, handle or email).
 *
 * Enter in the search box searches instead of sending the form. The picked account goes up to
 * NewDataRequestForm by user ID; the email used to find it is never stored with the request.
 * Who shows it: NewDataRequestForm. What it calls: usePersonSearch.
 */
import { useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import type { UserMatch } from '@/features/staff/api/userManagement';

import { usePersonSearch } from '../../hooks/usePersonSearch';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the picker needs. */
interface DataRequestPersonPickerProps {
  pickedUserId: string | null;
  onPick: (userId: string | null) => void;
}

/**
 * The words for one account in the list.
 *
 * @returns "@handle", "@handle (Pen Name)" or "An account with no username yet"
 */
function useMatchLabel() {
  const { t } = useDataRequestsTranslation();
  return (match: UserMatch) => {
    if (match.handle === null) return t('new.matchNoHandle');
    if (match.penName === null) return t('new.matchOption', { handle: match.handle });
    return t('new.matchOptionWithPenName', { handle: match.handle, penName: match.penName });
  };
}

/**
 * The accounts found, as one radio group, or why there are none.
 *
 * @returns the group or a line of text
 */
function PersonMatches({
  people,
  pickedUserId,
  onPick,
}: DataRequestPersonPickerProps & { people: ReturnType<typeof usePersonSearch> }) {
  const { t } = useDataRequestsTranslation();
  const labelOf = useMatchLabel();
  if (people.isTooShort) return <p className="m-0 text-sm text-meta">{t('new.tooShort')}</p>;
  if (people.hasFailed) return <Notice tone="error">{t('failures.unreachable')}</Notice>;
  if (!people.hasSearched || people.isSearching) return null;
  if (people.matches.length === 0) return <p className="m-0 text-body">{t('new.noMatches')}</p>;
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 text-sm font-semibold text-ink">{t('new.matchesLabel')}</legend>
      <p className="m-0 text-[13px] text-meta">{t('new.pickHint')}</p>
      {people.matches.map((match) => (
        <label key={match.userId} className="flex min-h-11 items-center gap-3 text-body">
          <input
            type="radio"
            name="data-request-person"
            className="size-5"
            checked={pickedUserId === match.userId}
            onChange={() => onPick(match.userId)}
          />
          {labelOf(match)}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Renders the picker.
 *
 * @returns the search field, its button and the accounts found
 */
export function DataRequestPersonPicker({ pickedUserId, onPick }: DataRequestPersonPickerProps) {
  const { t } = useDataRequestsTranslation();
  const people = usePersonSearch();
  const [searchText, setSearchText] = useState('');

  /** Starts a new search and forgets the account picked from the last one. */
  function runSearch() {
    onPick(null);
    people.search(searchText);
  }

  /** Enter in the search box searches instead of sending the form. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    runSearch();
  }

  return (
    <div className="flex flex-col gap-3">
      <TextInput
        id="data-request-person-search"
        type="search"
        label={t('new.findPerson')}
        hint={t('new.findHint')}
        value={searchText}
        autoCapitalize="none"
        onChange={(event) => setSearchText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        variant="secondary"
        className="self-start"
        onClick={runSearch}
        disabled={people.isSearching}
      >
        {t('new.search')}
      </Button>
      <PersonMatches people={people} pickedUserId={pickedUserId} onPick={onPick} />
    </div>
  );
}
