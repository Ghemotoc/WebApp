/**
 * SearchForm: the search field with "Search" and "Clear" (story S1-E5-04; user story 1.7, board
 * A07-Search).
 *
 * Results start after two letters and follow what is typed: a short pause after the last key
 * puts the term in the address in place (no new history entry), so the page below updates as the
 * member types. Search (or the Enter key) does the same at once, adds a history entry so Back
 * works, and keeps the term in Recent searches on this device (lib/recentSearches.ts).
 * "Clear" empties the field and puts the focus back in it.
 * Look (board A07): one bordered field the width of the page, with a quiet Search button beside
 * it; Clear is a round × named "Clear the search", shown once there is text. On a phone the
 * keyboard's search key sends the form, so the button only shows from 768 px (bundle CALM-7c).
 * Who uses it: SearchPage. What it calls: the router and lib/recentSearches.ts.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { CrossIcon } from '@/components/icons/CrossIcon';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

import { addRecentSearch } from '../lib/recentSearches';
import { isSearchable, searchAddress } from '../lib/searchAddresses';
import { useSearchTranslation } from '../registerSearchTranslations';

/** How long to wait after the last key before searching, in milliseconds. */
const TYPING_PAUSE_MS = 300;

/** What the form needs. */
export interface SearchFormProps {
  /** The term in the address now. */
  initialTerm?: string;
}

/**
 * Searches as the member types: after a short pause, a searchable term that differs from the
 * address replaces it.
 *
 * @param term - what the field holds
 * @param addressTerm - what the address holds
 */
function useSearchAsYouType(term: string, addressTerm: string) {
  const navigate = useNavigate();
  useEffect(() => {
    const trimmed = term.trim();
    // Nothing to do until two letters are typed, or when the address already has this term.
    if (!isSearchable(trimmed) || trimmed === addressTerm) return;
    const timer = window.setTimeout(() => {
      void navigate(searchAddress(trimmed), { replace: true });
    }, TYPING_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [term, addressTerm, navigate]);
}

/**
 * Renders the form.
 *
 * @returns the search form
 */
export function SearchForm({ initialTerm = '' }: SearchFormProps) {
  const { t } = useSearchTranslation();
  const navigate = useNavigate();
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(initialTerm);
  const [lastAddressTerm, setLastAddressTerm] = useState(initialTerm);
  // A new term from outside the field (a recent search, Back) fills the field; one the field
  // typed itself is already there.
  if (initialTerm !== lastAddressTerm) {
    setLastAddressTerm(initialTerm);
    if (initialTerm.trim() !== term.trim()) setTerm(initialTerm);
  }
  useSearchAsYouType(term, initialTerm);

  /** Opens the search page for what was typed, and remembers it on this device. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSearchable(term.trim())) addRecentSearch(term);
    void navigate(searchAddress(term));
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <SearchInput
          ref={field}
          id={id}
          label={t('form.label')}
          placeholder={t('form.placeholder')}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="h-11 w-full rounded-field border border-control-border bg-surface pr-12 pl-12 font-body type-body text-ink"
        />
        {term !== '' && (
          <button
            type="button"
            aria-label={t('form.clearLabel')}
            className="absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
            onClick={() => {
              setTerm('');
              field.current?.focus();
            }}
          >
            <CrossIcon size={18} />
          </button>
        )}
      </div>
      <Button type="submit" variant="secondary" className="max-md:hidden">
        {t('form.submit')}
      </Button>
    </form>
  );
}
