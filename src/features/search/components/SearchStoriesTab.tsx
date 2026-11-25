/**
 * SearchStoriesTab: the Stories tab of the search results (user story 1.8, board
 * A08-SearchResults).
 *
 * From 1024 px: "Filter and sort" in a column on the left with the one advert box under it
 * (Robert, 20 Nov 2026, 17:42), and the stories on the right: "48 stories for “salt”" with
 * "Sorted by best match", one row per story, then "Show more results". Below 1024 px:
 * "Filter and sort · 1" opens the same fields in a sheet, with the number of filters on.
 * No banner sits between results (Robert, 20 Nov 2026, 17:43). With nothing found: "No stories
 * match “salt”", three suggestions and Clear filters.
 * Who uses it: SearchResults. What it calls: useStoryList() (the 'search' list, so ratings,
 * blocks and moderation stay in the database) and SearchFilterFields.
 */
import { useId, useState } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import type { useStoryList } from '@/features/discovery/hooks/useStoryList';

import { filtersOn, sortInUse } from '../lib/searchFilters';
import { useSearchTranslation } from '../registerSearchTranslations';

import { SearchFilterFields } from './SearchFilterFields';
import { StoryResultRow } from './StoryResultRow';

/** What the tab needs. */
export interface SearchStoriesTabProps {
  term: string;
  request: ListRequest;
  list: ReturnType<typeof useStoryList>;
  onChange: (next: ListRequest) => void;
}

/**
 * "Filter and sort · 1" and its sheet, below 1024 px.
 *
 * @param props - the list and how to change it
 * @returns the button and the sheet
 */
function FilterSheet({ request, onChange }: Pick<SearchStoriesTabProps, 'request' | 'onChange'>) {
  const { t } = useSearchTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const count = filtersOn(request);
  return (
    <div className="min-[1024px]:hidden">
      <Button variant="secondary" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        {count > 0 ? t('filters.titleWithCount', { count }) : t('filters.title')}
      </Button>
      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('filters.title')}>
        <SearchFilterFields request={request} onChange={onChange} />
        <ButtonRow>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            {t('filters.done')}
          </Button>
        </ButtonRow>
      </Sheet>
    </div>
  );
}

/**
 * "No stories match …", three suggestions and Clear filters when any is on.
 *
 * @param props - the term, the list and how to change it
 * @returns the empty state
 */
function NoStories({ term, request, onChange }: Omit<SearchStoriesTabProps, 'list'>) {
  const { t } = useSearchTranslation();
  return (
    <div className="flex flex-col gap-4 border-t border-hairline pt-6">
      <h3 className="m-0 type-subheading text-ink-heading">{t('stories.none', { term })}</h3>
      <ul className="m-0 flex list-disc flex-col gap-2 pl-6 type-body text-ink-muted">
        <li>{t('stories.tipSpelling')}</li>
        <li>{t('stories.tipFewer')}</li>
        <li>{t('stories.tipTag')}</li>
      </ul>
      {filtersOn(request) > 0 && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => onChange({ ...request, completion: null, languageCode: null })}
        >
          {t('filters.clear')}
        </Button>
      )}
    </div>
  );
}

/**
 * The heading, the rows and "Show more results".
 *
 * @param props - the term, the list and how to change it
 * @returns the results column
 */
function StoryRows({ term, request, list, onChange }: SearchStoriesTabProps) {
  const { t } = useSearchTranslation();
  const headingId = useId();
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!list.isLoaded || list.total === null) return null;
  if (list.total === 0) return <NoStories term={term} request={request} onChange={onChange} />;
  const covers = designsForRow(list.stories);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} aria-live="polite" className="m-0 type-subheading text-ink-heading">
          {t('stories.heading', { count: list.total, term })}
        </h2>
        <p className="m-0 type-meta text-ink-muted">
          {t('stories.sortedBy', { sort: t(`filters.sort.${sortInUse(request)}`) })}
        </p>
      </div>
      <ul aria-labelledby={headingId} className="m-0 list-none border-t border-hairline p-0">
        {list.stories.map((story, index) => (
          <StoryResultRow
            key={story.slug}
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
          />
        ))}
      </ul>
      {list.hasMore && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={list.isLoadingMore}
          onClick={list.loadMore}
        >
          {t('stories.showMore')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the tab.
 *
 * @param props - the term, the list with its filters, its stories and how to change it
 * @returns the filters column and the results
 */
export function SearchStoriesTab(props: SearchStoriesTabProps) {
  const { t } = useSearchTranslation();
  return (
    <div className="grid gap-8 min-[1024px]:grid-cols-[minmax(0,300px)_minmax(0,1fr)] min-[1024px]:items-start min-[1024px]:gap-12">
      <aside
        aria-labelledby="search-filters-heading"
        className="flex flex-col gap-8 max-[1023px]:hidden"
      >
        <h2 id="search-filters-heading" className="m-0 type-subheading text-ink-heading">
          {t('filters.title')}
        </h2>
        <SearchFilterFields request={props.request} onChange={props.onChange} />
        {/* The one advert box, under the filters (Robert, 20 Nov 2026, 17:42). */}
        <PageAdSlot pageKey="search" position={2} isSpaceReserved={false} />
      </aside>
      <div className="flex min-w-0 flex-col gap-6">
        <FilterSheet request={props.request} onChange={props.onChange} />
        <StoryRows {...props} />
      </div>
    </div>
  );
}
