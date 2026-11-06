/**
 * FeaturedPage: Stories › Featured, where an admin or the owner picks Featured this week for
 * Discover (story S1-E5-10, bundle LOOK-4a; Robert, 6 Nov 2026: staff see the ranks of all current
 * active stories and mix well-known stories with promising less-known ones; they don't reorder
 * the ranking; the writer must be 16 or over).
 *
 * It shows four views (All ranked, Rising, New writers, Promising), a sort drop-down that only
 * changes the order on screen, the ranking table and the pick list with Save. Plain staff look:
 * no doodles.
 * Who shows it: the router at /staff/featured, inside StaffLayout (the "featured" area: owner and
 * admin). The database refuses everyone else (admin_featured_candidates()), and the page says so.
 * What it calls: useFeaturedPicks → api/featured.ts; FeaturedTable and FeaturedPickList.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import { featuredViews, type FeaturedView } from '../../api/featured';
import { useFeaturedPicks } from '../../hooks/useFeaturedPicks';

import { featuredSortKeys, sortedCandidates, type FeaturedSortKey } from './featuredColumns';
import { FeaturedPickList } from './FeaturedPickList';
import { FeaturedTable } from './FeaturedTable';

/** useFeaturedPicks's result, passed down once. */
type FeaturedState = ReturnType<typeof useFeaturedPicks>;

/**
 * The view chips and the sort drop-down.
 *
 * @returns the controls row
 */
function ViewControls(props: {
  view: FeaturedView;
  onView: (view: FeaturedView) => void;
  sortKey: FeaturedSortKey;
  onSort: (key: FeaturedSortKey) => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-wrap items-end gap-6">
      <ChoiceChips
        label={t('featured.viewLabel')}
        isLabelVisible
        options={featuredViews.map((view) => ({ value: view, label: t(`featured.views.${view}`) }))}
        value={props.view}
        onChange={(value) => props.onView(value as FeaturedView)}
        description={t(`featured.viewHints.${props.view}`)}
      />
      <Select
        id="featured-sort"
        label={t('featured.sortLabel')}
        isLabelVisible
        options={featuredSortKeys.map((key) => ({ value: key, label: t(`featured.sorts.${key}`) }))}
        value={props.sortKey}
        onChange={(value) => props.onSort(value as FeaturedSortKey)}
      />
    </div>
  );
}

/**
 * The ranking and the picks, once loaded.
 *
 * @returns the two panels
 */
function FeaturedBody({
  state,
  allStories,
  sortKey,
}: {
  state: FeaturedState;
  allStories: FeaturedState['data'];
  sortKey: FeaturedSortKey;
}) {
  const { t } = useTranslation('staff');
  const data = state.data;
  if (data === null) return <p className="m-0 text-body">{t('featured.loading')}</p>;
  // Rank sorts top first; every other column most or newest first.
  const stories = sortedCandidates(data.stories, { key: sortKey, isAscending: sortKey === 'rank' });
  return (
    <div className="flex flex-col gap-8">
      <FeaturedPickList
        picks={state.picks}
        known={allStories?.stories ?? data.stories}
        featuredMax={data.featuredMax}
        onMove={state.move}
        onRemove={state.toggle}
        onSave={state.save}
        isSaving={state.isSaving}
        saveFailure={state.saveFailure}
        hasSaved={state.hasSaved}
      />
      <p className="m-0 text-sm text-meta">{t('featured.total', { count: data.total })}</p>
      {stories.length === 0 ? (
        <p className="m-0 text-body">{t('featured.noneInView')}</p>
      ) : (
        <FeaturedTable
          stories={stories}
          picks={state.picks}
          featuredMax={data.featuredMax}
          onToggle={state.toggle}
        />
      )}
    </div>
  );
}

/**
 * The page under its header: a refusal, an error, or the controls, picks and table.
 *
 * @returns the content
 */
function FeaturedContent(props: {
  state: FeaturedState;
  allStories: FeaturedState['data'];
  view: FeaturedView;
  onView: (view: FeaturedView) => void;
}) {
  const { t } = useTranslation('staff');
  const [sortKey, setSortKey] = useState<FeaturedSortKey>('rank');
  const failure = props.state.loadFailure;
  if (failure === 'not_allowed') return <p className="m-0 text-body">{t('featured.notAllowed')}</p>;
  if (failure !== null) return <Notice tone="error">{t(`featured.failures.${failure}`)}</Notice>;
  return (
    <>
      <ViewControls view={props.view} onView={props.onView} sortKey={sortKey} onSort={setSortKey} />
      <FeaturedBody state={props.state} allStories={props.allStories} sortKey={sortKey} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the page
 */
export function FeaturedPage() {
  const { t } = useTranslation('staff');
  const [view, setView] = useState<FeaturedView>('all');
  const state = useFeaturedPicks(view);
  // The "All ranked" view names every pick, whichever view is open.
  const all = useFeaturedPicks('all');
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-2">
        <Eyebrow>{t('nav.stories')}</Eyebrow>
        <h1 className="m-0 font-heading text-3xl font-bold text-heading">
          {t('featured.heading')}
        </h1>
        <p className="m-0 max-w-[720px] text-body">{t('featured.intro')}</p>
      </header>
      <FeaturedContent state={state} allStories={all.data} view={view} onView={setView} />
    </PageContainer>
  );
}
