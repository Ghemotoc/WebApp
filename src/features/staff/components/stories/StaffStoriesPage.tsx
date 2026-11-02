/**
 * StaffStoriesPage: /staff/stories, every story on the platform (bundle ADMIN-2, part a; story
 * S1-E11-07; board AdminStories 8.10; architecture 1.8.2 and 1.8.4).
 *
 * Staff search by title, by the writer's current or earlier username, or by user ID, and filter
 * by status, category, language, rating, where it can be read, open reports and writers under 18.
 * Each story opens its own page; there are no bulk actions. Plain components, no doodles (DoD:
 * staff screens).
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but owner, admin,
 * moderator and support (admin_search_stories()), and the page says so.
 * What it calls: useStaffStories → api/staffStories.ts.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useStaffStories } from '../../hooks/useStaffStories';

import { StaffStoryFiltersBar } from './StaffStoryFiltersBar';
import { StaffStoryResults } from './StaffStoryResults';

/** useStaffStories's result, passed down once. */
type StoryList = ReturnType<typeof useStaffStories>;

/**
 * Previous and Next, with "Page 2 of 3" between them; hidden when everything fits on one page.
 *
 * @returns the page buttons, or nothing
 */
function PageButtons({ list }: { list: StoryList }) {
  const { t } = useTranslation('staff');
  if (list.page === null) return null;
  const pageCount = Math.ceil(list.page.total / list.page.pageSize);
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t('stories.pagesLabel')} className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={list.pageNumber === 0}
        onClick={() => list.goToPage(list.pageNumber - 1)}
      >
        {t('stories.previousPage')}
      </Button>
      <span className="text-sm text-meta">
        {t('stories.pageOf', { page: list.pageNumber + 1, count: pageCount })}
      </span>
      <Button
        variant="secondary"
        disabled={list.pageNumber + 1 >= pageCount}
        onClick={() => list.goToPage(list.pageNumber + 1)}
      >
        {t('stories.nextPage')}
      </Button>
    </nav>
  );
}

/**
 * What goes under the filters: a refusal, an error, the results or "no stories match".
 *
 * @returns the results part
 */
function StoryListResults({ list }: { list: StoryList }) {
  const { t } = useTranslation('staff');
  if (list.failure === 'not_allowed')
    return <p className="m-0 text-body">{t('stories.notAllowed')}</p>;
  if (list.failure !== null) return <Notice tone="error">{t('stories.loadFailed')}</Notice>;
  if (list.page === null) return null;
  return (
    <section aria-labelledby="stories-results-heading" className="flex flex-col gap-3">
      <h2 id="stories-results-heading" className="sr-only">
        {t('stories.resultsHeading')}
      </h2>
      <p role="status" className="m-0 text-sm text-meta">
        {t('stories.found', { count: list.page.total })}
      </p>
      {list.page.stories.length === 0 ? (
        <p className="m-0 text-body">{t('stories.noneMatch')}</p>
      ) : (
        <StaffStoryResults stories={list.page.stories} />
      )}
      <PageButtons list={list} />
      <p className="m-0 text-sm text-meta">{t('stories.listNote')}</p>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the Stories screen
 */
export function StaffStoriesPage() {
  const { t } = useTranslation('staff');
  const list = useStaffStories();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('stories.documentTitle')}</title>
      <div className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('stories.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('stories.heading')}
        </h1>
        <p className="m-0 text-body">{t('stories.intro')}</p>
        <div className="flex flex-wrap gap-2">
          <InfoPill tone="plum">{t('stories.oneOwnerPill')}</InfoPill>
          <InfoPill tone="neutral">{t('stories.auditPill')}</InfoPill>
        </div>
      </div>
      <StaffStoryFiltersBar filters={list.filters} setFilters={list.setFilters} />
      <StoryListResults list={list} />
    </PageContainer>
  );
}
