/**
 * AtlasSearchPage: /plan/s/:storySlug/search?q=…, the results of one search across the open
 * story (story S1-E17-30; redrawn as board E34 in user stories bundle 6, story 6.15).
 *
 * The Story Atlas top bar, the heading with "Only you can see your plan.", the search bar holding
 * the query (up to 560 px, with the quiet "Search"), the count line ("9 results for “register”",
 * announced when results arrive), then one section a type, one under another (characters, story
 * world entries, chapters, scenes, questions and ideas, timeline events, marketing notes), each
 * with its count and rows between hairlines: the item's title as a link and the snippet with the
 * match marked. Too short, nothing found and a failure each say so in the same announced line.
 * Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStorySearch → search_story(); lib/searchGroups.ts; SearchResultItem; useMyStories for the
 * top bar and the story's title.
 */
import { useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { shortestSearch } from '../api/search';
import { useStorySearch } from '../hooks/useStorySearch';
import { groupSearchResults, type SearchGroup } from '../lib/searchGroups';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasSearchBox } from './AtlasSearchBox';
import { AtlasFrame } from './AtlasFrame';
import { SearchResultItem } from './SearchResultItem';

/** One type's results: its name with the count, then a row each between hairlines. */
function ResultGroup({ slug, query, group }: { slug: string; query: string; group: SearchGroup }) {
  const { t } = useAtlasTranslation();
  return (
    <section aria-labelledby={`atlas-search-${group.kind}`} className="flex min-w-0 flex-col gap-1">
      <h2
        id={`atlas-search-${group.kind}`}
        className="m-0 type-label font-semibold break-words text-ink-heading"
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
  );
}

/** The line under the bar: too short, nothing found or the count (board E34). */
function useStatusLine(state: ReturnType<typeof useStorySearch>, query: string): string {
  const { t } = useAtlasTranslation();
  if (state.isTooShort) return t('search.tooShort', { count: shortestSearch });
  if (state.results === undefined || state.results === null || state.loadFailed) return '';
  if (state.results.length === 0) return t('search.nothing', { query });
  return t('search.count', { count: state.results.length, query });
}

/**
 * What shows under the heading: the bar with its announced line, then the groups. The line is
 * one live region that stays on the page, so a screen reader hears each new count (story 6.15).
 */
function SearchBody({ slug, query }: { slug: string; query: string }) {
  const { t } = useAtlasTranslation();
  const trimmed = query.trim();
  const search = useStorySearch(slug, query);
  const statusLine = useStatusLine(search, trimmed);
  const hasResults = !search.isTooShort && Array.isArray(search.results);
  const groups = hasResults ? groupSearchResults(search.results ?? []) : [];
  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <AtlasSearchBox key={query} slug={slug} isPageBar />
        <p
          role="status"
          data-testid="atlas-search-status"
          className="m-0 type-subheading font-bold break-words text-ink-heading empty:hidden"
        >
          {statusLine}
        </p>
        {search.loadFailed && <Notice tone="error">{t('search.failed')}</Notice>}
        {search.results === null && <Notice tone="error">{t('notFound')}</Notice>}
      </div>
      {groups.map((group) => (
        <ResultGroup key={group.kind} slug={slug} query={trimmed} group={group} />
      ))}
    </>
  );
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
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section={null}
      showsChrome={userId !== null}
    >
      <title>{t('search.documentTitle', { query })}</title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {userId !== null && (
        // Board E34: 40 px between the heading, the bar and each group (32 on the scale).
        <div className="flex min-w-0 flex-col gap-8">
          <AtlasPageHeading title={t('search.heading')} />
          <SearchBody slug={storySlug} query={query} />
        </div>
      )}
    </AtlasFrame>
  );
}
