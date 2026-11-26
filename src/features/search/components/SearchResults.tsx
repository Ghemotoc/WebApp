/**
 * SearchResults: what a search found, under the search field (story S1-E5-04; user story 1.8,
 * board A08-SearchResults).
 *
 * Tabs, each with its count: Stories, Writers, Together and Spaces, as board A08 draws them; the
 * open tab sits on the white bubble (SegmentedControl) and lives in the address (?in=), so Back
 * and a shared link keep it. Stories: the filters column and the rows (SearchStoriesTab).
 * Writers: avatar, pen name, what they write and Follow. Together: threads and posts with their
 * forum. Spaces: the spaces whose name or description holds the term (search_spaces()). The
 * database leaves out what this reader may not see (ratings, age groups, classes, blocks,
 * moderation), so the page adds no rules; the safety line says so.
 * Who uses it: SearchPage. What it calls: useStoryList(), useFoundWritersList(),
 * useForumSearch() and useFoundSpaces().
 */
import { useId, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import { useStoryList } from '@/features/discovery/hooks/useStoryList';
import { ForumSearchResultRow } from '@/features/forums/components/ForumSearchResultRow';
import { useForumSearch } from '@/features/forums/hooks/useForumSearch';
import { useFoundSpaces } from '@/features/spaces/hooks/useSpaces';

import { useFoundWritersList } from '../hooks/useSearchGroupList';
import {
  paramsFor,
  paramsForTab,
  searchTabs,
  storiesRequest,
  tabFrom,
  type SearchTab,
} from '../lib/searchFilters';
import { useSearchTranslation } from '../registerSearchTranslations';

import { SearchStoriesTab } from './SearchStoriesTab';
import { SpaceResultRow } from './SpaceResultRow';
import { WriterResultRow } from './WriterResultRow';

/** What a list of rows with "Show more results" needs. */
interface MoreRowsProps {
  label: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onMore: () => void;
  children: ReactNode;
  emptyText: string | null;
}

/**
 * Rows under a hairline, then "Show more results", or one line when there are none.
 *
 * @param props - the list's name, its rows and the "more" state
 * @returns the list block
 */
function MoreRows({ label, hasMore, isLoadingMore, onMore, children, emptyText }: MoreRowsProps) {
  const { t } = useSearchTranslation();
  if (emptyText !== null) return <p className="m-0 type-body text-ink-muted">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label={label} className="m-0 list-none border-t border-hairline p-0">
        {children}
      </ul>
      {hasMore && (
        <Button variant="secondary" className="w-full" disabled={isLoadingMore} onClick={onMore}>
          {t('stories.showMore')}
        </Button>
      )}
    </div>
  );
}

/** The Writers tab: one row each with Follow. */
function WritersTab({
  term,
  list,
}: {
  term: string;
  list: ReturnType<typeof useFoundWritersList>;
}) {
  const { t } = useSearchTranslation();
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!list.isLoaded) return null;
  return (
    <MoreRows
      label={t('tabs.writers')}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onMore={list.loadMore}
      emptyText={list.items.length === 0 ? t('tabs.noneWriters', { term }) : null}
    >
      {list.items.map((writer) => (
        <WriterResultRow key={writer.handle} writer={writer} />
      ))}
    </MoreRows>
  );
}

/** The Together tab: threads and posts, each with its forum. */
function TogetherTab({ term, list }: { term: string; list: ReturnType<typeof useForumSearch> }) {
  const { t } = useSearchTranslation();
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (list.results === null) return null;
  return (
    <MoreRows
      label={t('tabs.together')}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onMore={list.showMore}
      emptyText={list.results.length === 0 ? t('tabs.noneTogether', { term }) : null}
    >
      {list.results.map((result) => (
        <ForumSearchResultRow key={`${result.threadNumber}-${result.postNumber}`} result={result} />
      ))}
    </MoreRows>
  );
}

/** The Spaces tab: one row per space found (user story 1.8, board A08). */
function SpacesTab({ term, list }: { term: string; list: ReturnType<typeof useFoundSpaces> }) {
  const { t } = useSearchTranslation();
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (list.spaces === null) return null;
  return (
    <MoreRows
      label={t('tabs.spaces')}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onMore={list.showMore}
      emptyText={list.spaces.length === 0 ? t('tabs.noneSpaces', { term }) : null}
    >
      {list.spaces.map((space) => (
        <SpaceResultRow key={space.id} space={space} />
      ))}
    </MoreRows>
  );
}

/** How many spaces a page of the Spaces tab holds, as many as the other tabs' rows. */
const spacesPageSize = 20;

/**
 * A tab's count: the total when the database gives one, the rows loaded so far with "+" while
 * more wait (Together pages without a total), or nothing while loading.
 *
 * @param total - the count, or null while loading
 * @param hasMore - whether more wait beyond the count
 * @returns the count as text
 */
function countText(total: number | null, hasMore = false): string {
  if (total === null) return '';
  return hasMore ? `${total}+` : String(total);
}

/**
 * Follows the four lists for one term, all at once, so every tab shows its count.
 *
 * @param term - the search term
 * @param request - the stories list with its filters
 * @returns the four lists
 */
function useSearchTabs(term: string, request: ListRequest) {
  const stories = useStoryList(request);
  const writers = useFoundWritersList(term);
  const together = useForumSearch({ term, forumSlug: null, authorHandle: null });
  const spaces = useFoundSpaces(term, spacesPageSize);
  return { stories, writers, together, spaces };
}

/**
 * Renders the tabs and the open one.
 *
 * @param props.term - the search term from the address
 * @returns the results block
 */
export function SearchResults({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  const name = useId();
  const [params, setParams] = useSearchParams();
  const tab = tabFrom(params);
  const request = storiesRequest(term, params);
  const lists = useSearchTabs(term, request);
  const counts: Record<SearchTab, string> = {
    stories: countText(lists.stories.total),
    writers: countText(lists.writers.total),
    together: countText(lists.together.results?.length ?? null, lists.together.hasMore),
    spaces: countText(lists.spaces.total),
  };
  // A new filter or tab rewrites the address in place: no history entry per click.
  const changeStories = (next: ListRequest) => setParams(paramsFor(next, tab), { replace: true });
  const chooseTab = (next: SearchTab) => setParams(paramsForTab(params, next), { replace: true });
  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl
        legend={t('tabs.label')}
        isLegendVisible={false}
        name={name}
        options={searchTabs.map((value) => ({
          value,
          label: `${t(`tabs.${value}`)} ${counts[value]}`.trim(),
        }))}
        value={tab}
        onChange={chooseTab}
      />
      {tab === 'stories' && (
        <SearchStoriesTab
          term={term}
          request={request}
          list={lists.stories}
          onChange={changeStories}
        />
      )}
      {tab === 'writers' && <WritersTab term={term} list={lists.writers} />}
      {tab === 'together' && <TogetherTab term={term} list={lists.together} />}
      {tab === 'spaces' && <SpacesTab term={term} list={lists.spaces} />}
      <p className="m-0 type-meta text-ink-muted">{t('groups.safetyNote')}</p>
    </div>
  );
}
