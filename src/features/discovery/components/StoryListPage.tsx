/**
 * StoryListPage: every story of one list, screen 3.10 See all (stories S1-E5-01, S1-E5-09;
 * design/boards/SeeAll.dc.html).
 *
 * Who shows it: the router, at /discover/all/:listKind (a Discover shelf's "View more"),
 * /discover/c/:categorySlug (a category page), /discover/t/:tag (a tag on the story page) and
 * /u/:handle/stories (a writer's profile) and /search/stories?q= (every story a search finds,
 * S1-E5-04). The address decides the list (listFromParams()).
 * What it shows: StoryListHeader, the filters, the rating note, then the stories as a grid with
 * "Load more" (StoryGrid). Filters and the sort live in the address, so a list can be shared;
 * the sort is also kept for the rest of the visit (S1-E5-02).
 * Nothing on the page depends on what the reader has read (S1-E5-09's legal note); the database
 * leaves out what this reader may not see (ratings, blocks, drafts, moderation).
 * What it calls: useStoryList → browse_stories().
 */
import { Link, useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import type { ListRequest, SortOrder } from '../api/storyLists';
import { useListTitle } from '../hooks/useListTitle';
import { useStoryList } from '../hooks/useStoryList';
import {
  listAddress,
  listDefaultSort,
  listFromParams,
  requestFromAddress,
} from '../lib/listAddresses';
import { rememberedSort, rememberSort } from '../lib/sortMemory';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { StoryGrid } from './StoryGrid';
import { StoryListFilters } from './StoryListFilters';
import { StoryListHeader } from './StoryListHeader';

/** "There is no such list", with the way back to Discover. */
function UnknownList() {
  const { t } = useDiscoveryTranslation();
  return (
    <EmptyState
      title={t('seeAll.unknownList')}
      description={t('seeAll.empty')}
      action={<Link to="/discover">{t('seeAll.discover')}</Link>}
    />
  );
}

/**
 * Whether any filter is set, so an empty list can offer to clear them.
 *
 * @param request - the list
 * @returns true when category, status or language narrows it
 */
function hasFilters(request: ListRequest): boolean {
  return (
    request.categorySlug !== null || request.completion !== null || request.languageCode !== null
  );
}

/**
 * The sort a list opens with (S1-E5-02): the address's, else the one the reader picked earlier
 * in this tab (fourth criterion), else the list's own (listDefaultSort(): popular for most lists
 * since S1-E5-03).
 *
 * @param request - the list as the address gives it
 * @returns the sort to use
 */
function sortInUse(request: ListRequest): SortOrder {
  // Search keeps its own "Best match" unless the reader picks another sort on it (S1-E5-04).
  if (request.kind === 'search') return request.sortOrder ?? listDefaultSort('search');
  return request.sortOrder ?? rememberedSort() ?? listDefaultSort(request.kind);
}

/**
 * The stories, or why there are none.
 *
 * @param request - the list with its filters
 * @param list - what useStoryList() answered
 * @param onClearFilters - takes every filter away
 * @returns the grid, an empty state or an error
 */
function ListResults({
  request,
  list,
  onClearFilters,
}: {
  request: ListRequest;
  list: ReturnType<typeof useStoryList>;
  onClearFilters: () => void;
}) {
  const { t } = useDiscoveryTranslation();
  if (list.loadFailed) return <Notice tone="error">{t('discover.loadFailed')}</Notice>;
  if (!list.isLoaded) return null;
  if (list.stories.length > 0) {
    return (
      <StoryGrid
        stories={list.stories}
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        onLoadMore={list.loadMore}
      />
    );
  }
  if (hasFilters(request)) {
    const clear = (
      <Button variant="secondary" onClick={onClearFilters}>
        {t('seeAll.clearFilters')}
      </Button>
    );
    return (
      <EmptyState
        title={t('seeAll.empty')}
        description={t('seeAll.emptyFiltered')}
        action={clear}
      />
    );
  }
  return <EmptyState title={t('seeAll.empty')} description={t('discover.empty')} />;
}

/**
 * The page for one list, once the address names a real one.
 *
 * @param kind - the list
 * @param listKey - its category, tag or username
 * @returns the page
 */
function KnownListPage({ kind, listKey }: { kind: ListRequest['kind']; listKey: string | null }) {
  const { t } = useDiscoveryTranslation();
  const { userId, isKnown } = useSession();
  const [search, setSearch] = useSearchParams();
  // Step 1: the list and its filters come from the address; the sort may come from this tab.
  const addressRequest = requestFromAddress(kind, listKey, search);
  const sortOrder = sortInUse(addressRequest);
  const request = { ...addressRequest, sortOrder };
  const list = useStoryList(request);
  const heading = useListTitle(request, list.stories);
  // Step 2: a filter change rewrites the address in place (no new history entry per click).
  // A new sort is kept for the next list in this tab (S1-E5-02, fourth criterion).
  function changeRequest(next: ListRequest) {
    if (next.sortOrder !== sortOrder) rememberSort(next.sortOrder);
    setSearch(new URL(listAddress(next), window.location.origin).searchParams, { replace: true });
  }
  if (heading.isUnknown) return <UnknownList />;
  // Step 3: the following list belongs to a signed-in reader.
  const needsLogIn = kind === 'following' && isKnown && userId === null;
  return (
    <>
      <title>
        {t('seeAll.documentTitle', { title: heading.title, productName: brand.productName })}
      </title>
      <StoryListHeader request={request} heading={heading} total={needsLogIn ? null : list.total} />
      {needsLogIn ? (
        <Notice tone="info">
          {t('seeAll.followingSignedOut')} <Link to="/sign-in">{t('seeAll.logIn')}</Link>
        </Notice>
      ) : (
        <>
          <StoryListFilters request={request} sortOrder={sortOrder} onChange={changeRequest} />
          <p className="m-0 text-sm text-meta">{t('seeAll.ratingNote')}</p>
          <ListResults
            request={request}
            list={list}
            onClearFilters={() =>
              changeRequest({
                ...request,
                categorySlug: null,
                completion: null,
                languageCode: null,
              })
            }
          />
        </>
      )}
    </>
  );
}

/**
 * Renders the page for the list the address names.
 *
 * @returns the list page, or "There is no such list"
 */
export function StoryListPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const { pathname } = useLocation();
  // /search/stories names its list by the term in ?q= (S1-E5-04); the other lists by the path.
  const isSearch = pathname === '/search/stories';
  const list = listFromParams({
    ...params,
    searchTerm: isSearch ? (search.get('q') ?? '') : undefined,
  });
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-14">
      {list === null ? (
        <UnknownList />
      ) : (
        <KnownListPage key={`${list.kind}:${list.key ?? ''}`} kind={list.kind} listKey={list.key} />
      )}
    </PageContainer>
  );
}
