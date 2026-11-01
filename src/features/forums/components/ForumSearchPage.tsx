/**
 * ForumSearchPage: the forum search's results, at /forums/search?q=…&forum=…&author=… (bundle
 * FORUMS-1, part f; story S1-E8-10).
 *
 * Who shows it: the router; the search field on the forum index leads here. Anyone can search,
 * signed out included.
 * What it shows: the breadcrumb, "Search the forums", the form with the forum and author filters
 * (criterion 1), then the threads and posts found, thread titles first, 20 at a time with "Show
 * more results". The database leaves out removed posts and people the reader blocks or who block
 * them (criterion 2), and matches without diacritics and with Romanian stemming.
 * What it calls: useForumSearch → search_forum_posts(); ForumSearchForm and ForumSearchResultRow.
 */
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

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
 * @param props.term - the term searched, for "Nothing found"
 * @returns the list, a note or nothing while loading
 */
function SearchResults({
  search,
  term,
}: {
  search: ReturnType<typeof useForumSearch>;
  term: string;
}) {
  const { t } = useForumsTranslation();
  if (!search.isSearching) return <p className="m-0 text-base text-body">{t('search.tooShort')}</p>;
  if (search.loadFailed) return <Notice tone="error">{t('search.loadFailed')}</Notice>;
  if (search.results === null) return null;
  if (search.results.length === 0)
    return <p className="m-0 text-base text-body">{t('search.none', { term: term.trim() })}</p>;
  return (
    <section aria-labelledby="forum-results-heading" className="flex flex-col gap-4">
      <h2 id="forum-results-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('search.results')}
      </h2>
      <ol className="m-0 list-none overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
        {search.results.map((result) => (
          <ForumSearchResultRow
            key={`${result.threadNumber}-${result.postNumber}`}
            result={result}
          />
        ))}
      </ol>
      {search.hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={search.showMore} disabled={search.isLoadingMore}>
            {t('search.showMore')}
          </Button>
        </div>
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
    <PageContainer className="flex flex-col gap-6 py-10">
      <ForumBreadcrumb path={[]} current={t('search.title')} />
      <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-none font-extrabold tracking-[-0.025em]">
        {t('search.title')}
      </h1>
      {/* A new address (a new search) starts the form afresh from it. */}
      <ForumSearchForm key={parameters.toString()} initial={query} showsFilters />
      <SearchResults search={search} term={query.term} />
    </PageContainer>
  );
}
