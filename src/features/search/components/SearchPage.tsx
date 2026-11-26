/**
 * SearchPage: search stories, writers and Together, screen 3.2 (story S1-E5-04; user stories 1.7
 * and 1.8, boards A07-Search and A08-SearchResults).
 *
 * Who shows it: the router, at /search?q=…; the search button in the top bar leads here.
 * What it shows: the title "Search" on the left and the search field the width of the page.
 * Before a search (board A07): Recent searches and Trending tags on the left (the searches kept
 * on this device only), and Writers to try with one advert that fills the column on the right; no advert under the field (Robert,
 * 20 Nov 2026, 17:44). With a term (board A08): the results tabs across the page (SearchResults),
 * with their own advert under the filters. A term under 2 letters says so instead of searching.
 * The term lives in the address, so a search can be shared; it follows what is typed
 * (SearchForm).
 * On phones the title is for screen readers only and the field sits at the top (bundle CALM-7c).
 * What it calls: SearchForm, RecentSearches, TrendingTags, SearchResults and RisingWritersList.
 */
import { useSearchParams } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { RisingWritersList } from '@/features/discovery/components/RisingWritersList';

import { isSearchable } from '../lib/searchAddresses';
import { useSearchTranslation } from '../registerSearchTranslations';

import { RecentSearches } from './RecentSearches';
import { SearchForm } from './SearchForm';
import { SearchResults } from './SearchResults';
import { TrendingTags } from './TrendingTags';

/**
 * What goes under the field once there is a term: "type at least 2 letters", or the results.
 *
 * @param props.term - the term from the address
 * @returns the block
 */
function SearchBody({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  if (!isSearchable(term))
    return <p className="m-0 type-body text-ink-muted">{t('page.tooShort')}</p>;
  return <SearchResults term={term} />;
}

/**
 * Renders the page.
 *
 * @returns the search screen
 */
export function SearchPage() {
  const { t } = useSearchTranslation();
  const [search] = useSearchParams();
  const term = (search.get('q') ?? '').trim();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-8 pb-16 max-md:gap-4 max-md:pt-4">
      <title>{t('page.documentTitle', { productName: brand.productName })}</title>
      <div className="flex flex-col gap-8 max-md:gap-3">
        <h1 className="m-0 min-w-0 break-words type-title lg:type-display max-md:sr-only">
          {t('page.heading')}
        </h1>
        <SearchForm initialTerm={term} />
      </div>
      {term === '' ? (
        // Left, the recent searches and the trending tags; right, Writers to try and the one advert that fills the
        // column (board A07; Robert, 20 Nov 2026, 17:42).
        <div className="grid gap-12 min-[1024px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[1024px]:items-start min-[1024px]:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <RecentSearches />
            <TrendingTags />
          </div>
          <aside aria-label={t('page.sideLabel')} className="flex min-w-0 flex-col gap-8">
            <RisingWritersList headingId="search-writers-heading" title={t('page.writersToTry')} />
            <PageAdSlot pageKey="search" position={2} isSpaceReserved={false} />
          </aside>
        </div>
      ) : (
        // The results take the page's width; their advert sits under the filters (board A08).
        <SearchBody term={term} />
      )}
    </PageContainer>
  );
}
