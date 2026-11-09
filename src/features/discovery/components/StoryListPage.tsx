/**
 * StoryListPage: every story of one list, screen 3.10 See all (stories S1-E5-01, S1-E5-09;
 * design/boards/SeeAll.dc.html).
 *
 * Who shows it: the router, at /discover/all/:listKind (a Discover shelf's "View more"),
 * /discover/c/:categorySlug (a category page), /discover/t/:tag (a tag on the story page) and
 * /u/:handle/stories (a writer's profile) and /search/stories?q= (every story a search finds,
 * S1-E5-04). The address decides the list (listFromParams()).
 * What it shows: StoryListHeader, the filters, the rating note, then the stories as a grid with
 * "Load more" (StoryGrid), with the list's ad high up and after every 10 stories (bundle G7e). Filters and the sort live in the address, so a list can be shared;
 * the sort is also kept for the rest of the visit (S1-E5-02).
 * Nothing on the page depends on what the reader has read (S1-E5-09's legal note); the database
 * leaves out what this reader may not see (ratings, blocks, drafts, moderation).
 * What it calls: useStoryList → browse_stories().
 */
import type { ReactNode } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

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

import { StoryGrid, type StoryGridAd } from './StoryGrid';
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
        ad={gridAdFor(request)}
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
 * The list's ad slot (S1-E12-01), as the grid places it: a wide banner on the classics list, a
 * card the size of a story card on every other list. It is chosen from the list's category, tag
 * and language only; the search term and anyone's username are never sent.
 *
 * @param request - the list with its filters
 * @returns the slot (it draws nothing for a visitor or when there is no ad)
 */
function listAdSlot(request: ListRequest): ReactNode {
  const isClassics = request.kind === 'classics';
  const context = {
    category: request.kind === 'category' ? request.key : request.categorySlug,
    tag: request.kind === 'tag' ? request.key : null,
    language: request.languageCode,
  };
  return (
    <PageAdSlot
      pageKey={isClassics ? 'classics' : 'see_all'}
      position={1}
      context={context}
      isSpaceReserved={isClassics}
    />
  );
}

/**
 * Where the list's ad goes (bundle G7e; Robert's design rules, 7 Nov 2026, "Content rules": the
 * first ad sits high, near the top, and long grids carry one after every 10 stories).
 * The classics list opens with its wide banner above the stories, then repeats it across a row
 * after every 10th story; every other list puts its card-sized ad after the 4th story (in the
 * first rows) and again after every 10 more, or after the last story of a list of 4 or fewer.
 *
 * @param request - the list with its filters
 * @returns the ad's places in the grid
 */
function gridAdFor(request: ListRequest): StoryGridAd {
  const isClassics = request.kind === 'classics';
  return {
    slot: listAdSlot(request),
    firstAfter: isClassics ? 10 : 4,
    spansRow: isClassics,
    // The classics banner already sits above a short list; any other short list ends on its ad.
    isShortListAdded: !isClassics,
  };
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
  // Step 3: the following list and "Picked for you" (S1-E2-06) belong to a signed-in reader.
  const isPersonal = kind === 'following' || kind === 'picked';
  const needsLogIn = isPersonal && isKnown && userId === null;
  return (
    <>
      <title>
        {t('seeAll.documentTitle', { title: heading.title, productName: brand.productName })}
      </title>
      <StoryListHeader request={request} heading={heading} total={needsLogIn ? null : list.total} />
      {needsLogIn ? (
        <Notice tone="info">
          {t(kind === 'picked' ? 'seeAll.pickedSignedOut' : 'seeAll.followingSignedOut')}{' '}
          <Link to="/sign-in">{t('seeAll.logIn')}</Link>
        </Notice>
      ) : (
        <>
          <StoryListFilters request={request} sortOrder={sortOrder} onChange={changeRequest} />
          <p className="m-0 text-sm text-meta">{t('seeAll.ratingNote')}</p>
          {/* The classics list's wide banner sits high, above the stories (G7e). */}
          {request.kind === 'classics' && listAdSlot(request)}
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
