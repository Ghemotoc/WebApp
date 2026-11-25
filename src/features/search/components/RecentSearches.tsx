/**
 * RecentSearches: the last searches on this device, under the field (user story 1.7, board A07).
 *
 * A heading with Clear at its right, then one row per term split by hairlines: a clock, the term
 * as a link that searches it again, and × to take it off. The terms never leave this browser
 * (lib/recentSearches.ts). With nothing kept, one line says what Search finds instead.
 * Who uses it: SearchPage, when there is no term yet. What it calls: lib/recentSearches.ts.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { CrossIcon } from '@/components/icons/CrossIcon';
import { Button } from '@/components/ui/Button';

import { searchAddress } from '../lib/searchAddresses';
import {
  clearRecentSearches,
  readRecentSearches,
  RECENT_SEARCHES_EVENT,
  removeRecentSearch,
} from '../lib/recentSearches';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Follows the kept terms, reading them again whenever the list changes.
 *
 * @returns the terms, newest first
 */
function useRecentSearches(): string[] {
  const [terms, setTerms] = useState(readRecentSearches);
  useEffect(() => {
    const reread = () => setTerms(readRecentSearches());
    window.addEventListener(RECENT_SEARCHES_EVENT, reread);
    return () => window.removeEventListener(RECENT_SEARCHES_EVENT, reread);
  }, []);
  return terms;
}

/**
 * Renders the section, or the page's opening line while no search is kept.
 *
 * @returns the section, or the line
 */
export function RecentSearches() {
  const { t } = useSearchTranslation();
  const terms = useRecentSearches();
  if (terms.length === 0) return <p className="m-0 type-body text-ink-muted">{t('page.start')}</p>;
  return (
    <section aria-labelledby="recent-searches-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-searches-heading" className="m-0 type-subheading text-ink-heading">
          {t('recent.heading')}
        </h2>
        <Button variant="text" onClick={clearRecentSearches}>
          {t('recent.clear')}
        </Button>
      </div>
      <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
        {terms.map((term) => (
          <li key={term} className="flex min-h-16 items-center gap-3">
            <ActionIcon name="clock" size={18} className="shrink-0 text-ink-muted" />
            <Link
              to={searchAddress(term)}
              className="min-w-0 flex-1 break-words type-label text-ink no-underline hover:underline"
            >
              {term}
            </Link>
            <button
              type="button"
              aria-label={t('recent.remove', { term })}
              onClick={() => removeRecentSearch(term)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
            >
              <CrossIcon size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
