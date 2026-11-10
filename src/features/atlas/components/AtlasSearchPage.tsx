/**
 * AtlasSearchPage: /plan/s/:storySlug/search?q=…, the results of one search across the open
 * story (story S1-E17-30).
 *
 * The Story Atlas top bar (its search box holds the query), the heading with what was searched
 * for, then the results grouped by type (characters, bible entries, chapters, scenes, questions
 * and ideas, timeline events, marketing notes), each with its count, a link to the item and a
 * snippet with the match marked. Only the writer sees any of it.
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
    return <p className="m-0 text-body">{t('search.nothing', { query })}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-sm text-meta" role="status">
        {t('search.count', { count: results.length, query })}
      </p>
      {groupSearchResults(results).map((group) => (
        <section
          key={group.kind}
          aria-labelledby={`atlas-search-${group.kind}`}
          className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-5 py-5 shadow-card md:px-7"
        >
          <h2
            id={`atlas-search-${group.kind}`}
            className="m-0 font-heading text-[22px] font-bold text-heading"
          >
            {t(`search.kinds.${group.kind}`, { count: group.results.length })}
          </h2>
          <ul className="m-0 list-none p-0">
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
          <SearchBody slug={storySlug} query={query} />
        </>
      )}
    </PageContainer>
  );
}
