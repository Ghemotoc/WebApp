/**
 * SearchPage: search stories, writers and tags, screen 3.2 (story S1-E5-04;
 * design/boards/Search.dc.html).
 *
 * Who shows it: the router, at /search?q=…; the search field on Discover leads here.
 * What it shows: the eyebrow and "Results for “…”" (or "Search" with no term), the search field
 * with the diacritics hint, then SearchResults. A term under 2 letters says so instead of
 * searching. The term lives in the address, so a search can be shared.
 * Board differences: the board's Forum posts group waits for the forums (S1-E8-10); its ad slot
 * waits for S1-E12; tags take the third group (the story's criteria: stories, writers, tags).
 * What it calls: SearchForm and SearchResults.
 */
import { useSearchParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import { isSearchable } from '../lib/searchAddresses';
import { useSearchTranslation } from '../registerSearchTranslations';

import { SearchForm } from './SearchForm';
import { SearchResults } from './SearchResults';

/**
 * What goes under the field: a prompt, "type at least 2 letters", or the results.
 *
 * @param props.term - the term from the address
 * @returns the block
 */
function SearchBody({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  if (term === '') return <p className="m-0 text-base text-body">{t('page.start')}</p>;
  if (!isSearchable(term)) return <p className="m-0 text-base text-body">{t('page.tooShort')}</p>;
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
  const heading = term === '' ? t('page.heading') : t('page.resultsFor', { term });
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-14">
      <title>{t('page.documentTitle', { productName: brand.productName })}</title>
      <header className="flex flex-col gap-2">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <div className="flex items-center gap-8">
          <h1 className="m-0 min-w-0 font-heading text-[clamp(32px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.02em] break-words text-heading">
            {heading}
          </h1>
        </div>
      </header>
      {/* A new term starts the field afresh, so the key is the term. */}
      <SearchForm key={term} initialTerm={term} showsHint />
      {/* The results with the portrait ad beside them from 1200 px; the wide ad comes after
          the results, never above them (S1-E12-01; board AdFormats). */}
      <div className="grid gap-8 min-[1200px]:grid-cols-[minmax(0,1fr)_300px] min-[1200px]:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <SearchBody term={term} />
          <PageAdSlot pageKey="search" position={1} />
        </div>
        <PageAdSlot pageKey="search" position={2} isSpaceReserved={false} />
      </div>
    </PageContainer>
  );
}
