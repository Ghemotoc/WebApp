/**
 * ForumSearchPage: the forum search's results, at /forums/search?q=…&forum=…&author=… (bundle
 * FORUMS-1, part f; story S1-E8-10).
 *
 * Who shows it: the router; the search field on the forum index leads here. Anyone can search,
 * signed out included.
 * What it shows: the breadcrumb, "Search the forums", the form with the forum and author filters
 * (criterion 1) and the order (BOOKS-7, board F02), then "48 results for …" and the threads and
 * posts found, thread titles first unless another order is picked, 20 at a time with "Show more
 * results", and an advert under them. The database leaves out removed posts and people the reader blocks or who block
 * them (criterion 2), and matches without diacritics and with Romanian stemming.
 * What it calls: useForumSearch → search_forum_posts(); ForumSearchForm, ForumSearchResultRow and
 * PageAdSlot.
 */
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import type { ForumSearchSort } from '../api/forumSearch';

import { useForumSearch } from '../hooks/useForumSearch';
import { forumSearchFromAddress } from '../lib/forumSearchAddress';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumBreadcrumb } from './ForumBreadcrumb';
import { ForumSearchForm } from './ForumSearchForm';
import { ForumSearchResultRow } from './ForumSearchResultRow';

/**
 * The results, or what to say instead.
 *
 * @param props.search - useForumSearch()'s answer
 * @param props.term - the term searched, for "Nothing found" and "48 results for …"
 * @param props.sort - the order, which the line under the heading names
 * @returns the list, a note or nothing while loading
 */
function SearchResults({
  search,
  term,
  sort,
}: {
  search: ReturnType<typeof useForumSearch>;
  term: string;
  sort: ForumSearchSort;
}) {
  const { t } = useForumsTranslation();
  if (!search.isSearching)
    return <p className="m-0 type-body text-ink-muted">{t('search.tooShort')}</p>;
  if (search.loadFailed) return <Notice tone="error">{t('search.loadFailed')}</Notice>;
  if (search.results === null) return null;
  if (search.results.length === 0)
    return (
      <p className="m-0 type-body text-ink-muted">{t('search.none', { term: term.trim() })}</p>
    );
  return (
    <section aria-labelledby="forum-results-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="forum-results-heading"
          className="m-0 font-heading type-subheading font-bold text-ink-heading"
        >
          {t('search.resultsFor', {
            count: search.total ?? search.results.length,
            term: term.trim(),
          })}
        </h2>
        <p className="m-0 type-meta text-ink-muted">{t(`search.orderNote.${sort}`)}</p>
      </div>
      <ol className="m-0 list-none border-b border-border p-0">
        {search.results.map((result) => (
          <ForumSearchResultRow
            key={`${result.threadNumber}-${result.postNumber}`}
            result={result}
          />
        ))}
      </ol>
      {search.hasMore && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={search.showMore}
          disabled={search.isLoadingMore}
        >
          {t('search.showMore')}
        </Button>
      )}
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the form and the results
 */
export function ForumSearchPage() {
  const { t } = useForumsTranslation();
  const [parameters] = useSearchParams();
  const query = forumSearchFromAddress(parameters);
  const search = useForumSearch(query);
  return (
    <PageContainer className="flex flex-col gap-6 py-8">
      <ForumBreadcrumb path={[]} current={t('search.title')} />
      <h1 className="page-title">{t('search.title')}</h1>
      {/* A new address (a new search) starts the form afresh from it. */}
      <ForumSearchForm key={parameters.toString()} initial={query} showsFilters />
      <SearchResults search={search} term={query.term} sort={query.sort ?? 'best'} />
      {/* Board F02: a banner under the results (slot forum_search_wide; staff turn it off or
          book it in Sponsors › Placements). */}
      <PageAdSlot pageKey="forum_search" position={1} className="flex justify-center" />
    </PageContainer>
  );
}
