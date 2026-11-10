/**
 * AtlasSearchPage: /plan/s/:storySlug/search?q=…, the results of one search across the open
 * story (story S1-E17-30).
 *
 * The Story Atlas top bar, the heading, the wide search bar holding the query, then the results
 * grouped by type (characters, bible entries, chapters, scenes, questions and ideas, timeline
 * events, marketing notes) in two columns of glass lists, each group with its count and each row
 * a link to the item with the match marked (board AtlasSearch, G10c4). Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStorySearch → search_story(); lib/searchGroups.ts; SearchResultItem; useMyStories for the
 * top bar and the story's title.
 */
import { useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { shortestSearch, type SearchResult } from '../api/search';
import { useStorySearch } from '../hooks/useStorySearch';
import { groupSearchResults } from '../lib/searchGroups';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasSearchBox } from './AtlasSearchBox';
import { AtlasTopBar } from './AtlasTopBar';
import { SearchResultItem } from './SearchResultItem';

/** The results, one section per type, or a plain line when there are none. */
function SearchResults({
  slug,
  query,
  results,
}: {
  slug: string;
  query: string;
  results: SearchResult[];
}) {
  const { t } = useAtlasTranslation();
  if (results.length === 0) {
    return <p className="m-0 break-words text-body">{t('search.nothing', { query })}</p>;
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p className="m-0 break-words text-body" role="status">
        {t('search.count', { count: results.length, query })}
      </p>
      <div className="grid min-w-0 items-start gap-x-6 gap-y-5 md:grid-cols-2">
        {groupSearchResults(results).map((group) => (
          <section
            key={group.kind}
            aria-labelledby={`atlas-search-${group.kind}`}
            className="flex min-w-0 flex-col gap-1.5"
          >
            <h2
              id={`atlas-search-${group.kind}`}
              className="m-0 px-[18px] text-[13px] font-semibold tracking-[0.08em] break-words text-meta uppercase"
            >
              {t(`search.kinds.${group.kind}`, { count: group.results.length })}
            </h2>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
              {group.results.map((result) => (
                <SearchResultItem
                  key={`${result.kind}-${result.ref}`}
                  slug={slug}
                  result={result}
                  query={query}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** What shows under the heading: a hint, a wait, a plain message or the results. */
function SearchBody({ slug, query }: { slug: string; query: string }) {
  const { t } = useAtlasTranslation();
  const { results, loadFailed, isTooShort } = useStorySearch(slug, query);
  if (isTooShort)
    return <p className="m-0 text-body">{t('search.tooShort', { count: shortestSearch })}</p>;
  if (loadFailed) return <Notice tone="error">{t('search.failed')}</Notice>;
  if (results === null) return <Notice tone="error">{t('notFound')}</Notice>;
  if (results === undefined) return null;
  return <SearchResults slug={slug} query={query.trim()} results={results} />;
}

/**
 * Renders the page.
 *
 * @returns the search page, or a plain message when signed out
 */
export function AtlasSearchPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { userId, isKnown } = useSession();
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>{t('search.documentTitle', { query })}</title>
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {userId !== null && (
        <>
          <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section={null} />
          <AtlasPageHeading title={t('search.heading')} />
          <AtlasSearchBox key={query} slug={storySlug} isPageBar />
          <SearchBody slug={storySlug} query={query} />
        </>
      )}
    </PageContainer>
  );
}
