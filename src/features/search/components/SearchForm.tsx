/**
 * SearchForm: the search field with "Search" and "Clear" (story S1-E5-04; board Search 3.2).
 *
 * Submitting opens /search?q=…, so the term lives in the address and the back button works.
 * "Clear" empties the field and puts the focus back in it. The hint under the field says
 * diacritics aren't needed (board 3.2).
 * Look (bundle G7c; board Search): the field and its buttons sit together in one glass pill, the
 * field itself without its own border, so the pill reads as one search bar. On a phone the
 * buttons stay in the pill beside the field.
 * Who uses it: SearchPage. What it calls: the router.
 */
import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

import { searchAddress } from '../lib/searchAddresses';
import { useSearchTranslation } from '../registerSearchTranslations';

/** What the form needs. */
export interface SearchFormProps {
  /** The term already searched, to start the field with. */
  initialTerm?: string;
  /** Show the "No need for diacritics" hint (the search page does; Discover doesn't). */
  showsHint?: boolean;
}

/**
 * Renders the form.
 *
 * @returns the search form
 */
export function SearchForm({ initialTerm = '', showsHint = false }: SearchFormProps) {
  const { t } = useSearchTranslation();
  const navigate = useNavigate();
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(initialTerm);

  /** Opens the search page for what was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void navigate(searchAddress(term));
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="glass-pill flex items-center gap-2 rounded-full p-1.5">
        <div className="min-w-0 flex-1">
          {/* No border of its own: the glass pill around it is the field's edge. */}
          <SearchInput
            ref={field}
            id={id}
            label={t('form.label')}
            placeholder={t('form.placeholder')}
            value={term}
            aria-describedby={showsHint ? `${id}-hint` : undefined}
            onChange={(event) => setTerm(event.target.value)}
            className="h-13 w-full rounded-full border-0 bg-transparent pr-3 pl-13 font-body text-base text-ink"
          />
        </div>
        <Button type="submit" size="lg">
          {t('form.submit')}
        </Button>
        {term !== '' && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => {
              setTerm('');
              field.current?.focus();
            }}
          >
            {t('form.clear')}
          </Button>
        )}
      </div>
      {showsHint && (
        <p id={`${id}-hint`} className="m-0 px-5 text-sm leading-normal text-body">
          <strong className="text-heading">{t('form.hintLead')}</strong> {t('form.hint')}
        </p>
      )}
    </form>
  );
}
