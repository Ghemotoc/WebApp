/**
 * YourWritingPage: "Writing", the writer's own stories, screen 4.1's lower half (story
 * S1-E3-01; design/boards/WriterDashboard.dc.html).
 *
 * Who shows it: the router, at /write; the top bar's "Write" button leads here.
 * What it shows: the header with "New story", then "Story by story" with one WriterStoryCard
 * per live story (filtered by Ongoing or Completed, S1-E3-05), or an empty state, and "Recently
 * deleted" with undo when a story was deleted in the last 30 days (S1-E3-05). Once the writer has
 * a story, the writer dashboard (S1-E3-07) joins it: "Continue draft" in the header, the tiles,
 * followers chart and drafts list above the stories (WriterDashboardTop), a numbers table in each
 * story card and "Latest comments" below. Between the two sits "Lines and stops"
 * (ChapterInsights, bundle IDEAS-1 part d): one chapter's most-loved lines and where readers stop.
 * Board D01 (user story 5.1) adds "Story Atlas" to the header and two adverts (PageAdSlot, page
 * write): one after the followers chart and one after the comments.
 * What it calls: useMyStories (stories through stories_select_own) and useWriterDashboard
 * (writer_dashboard()). After creating a story, NewStoryPage lands here with a "saved" notice
 * (router state).
 * Simplified look (bundle CALM-7c, board simplified/New-Write; board D01): the display title with
 * the line under it and, under them, "Continue draft" (the page's one main button), "New story"
 * and "Story Atlas" (quiet);
 * "How readers respond" is the one glass hero; sections have plain headings, no eyebrows, no cards
 * and no info pills.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import type { DashboardChapter, DashboardPeriod, WriterDashboard } from '../api/dashboard';
import type { MyStory } from '../api/stories';
import { useMyStories } from '../hooks/useMyStories';
import { useWriterDashboard } from '../hooks/useWriterDashboard';
import { allTimeCommentCount, waitingChapters } from '../lib/dashboardChapters';

import { ChapterInsights } from './ChapterInsights';
import { LatestComments } from './LatestComments';
import { RecentlyDeleted } from './RecentlyDeleted';
import { WriterDashboardTop } from './WriterDashboardTop';
import { WriterStoryCard } from './WriterStoryCard';

/** The status filter's choices: everything, Ongoing or Completed (S1-E3-05). */
type StatusFilter = 'all' | 'ongoing' | 'completed';

/**
 * The live stories that match the filter.
 *
 * @param stories - every story the writer has, deleted ones included
 * @param filter - the chosen status
 * @returns the stories to list
 */
function liveStoriesFor(stories: MyStory[], filter: StatusFilter): MyStory[] {
  return stories.filter(
    (story) => story.deletedAt === null && (filter === 'all' || story.completionStatus === filter),
  );
}

/** The board's "Continue draft", the page's one main button: the most recent draft's editor. */
function ContinueDraftLink({ chapters }: { chapters: DashboardChapter[] }) {
  const { t } = useTranslation('writing');
  const latest = waitingChapters(chapters).find((chapter) => chapter.status === 'draft');
  if (latest === undefined) return null;
  return (
    <Link
      to={`/write/s/${latest.storySlug}/c/${latest.chapterCode}`}
      className={buttonClassName({ variant: 'primary' })}
    >
      {t('dashboard.continueDraft')}
    </Link>
  );
}

/**
 * The "New story" link. In the header it is a quiet button with a plus beside "Continue draft"
 * (board D01); in the empty state, where it is the only thing to do, it is the main button.
 */
function NewStoryLink({ label, look }: { label: string; look: 'quiet' | 'main' }) {
  if (look === 'main') {
    return (
      <Link to="/write/new" className={buttonClassName({ variant: 'primary' })}>
        {label}
      </Link>
    );
  }
  return (
    <Link to="/write/new" className={buttonClassName({ variant: 'secondary' })}>
      <ActionIcon name="plus" />
      {label}
    </Link>
  );
}

/** "Story Atlas", the quiet button with the map that opens the writer's Atlas (board D01). */
function StoryAtlasLink() {
  const { t } = useTranslation('writing');
  return (
    <Link to="/plan" className={buttonClassName({ variant: 'secondary' })}>
      <ActionIcon name="map" />
      {t('storyCard.atlas')}
    </Link>
  );
}

/**
 * The Ongoing / Completed filter ("Readers can filter by it"; the writer can too), drawn as the
 * Write board's glass switch (SegmentedControl, bundle G9 WRITING, part b).
 */
function StatusFilterSwitch({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <SegmentedControl
      legend={t('status.filterLabel')}
      isLegendVisible={false}
      name="writing-status-filter"
      options={[
        { value: 'all', label: t('status.all') },
        { value: 'ongoing', label: t('status.ongoing') },
        { value: 'completed', label: t('status.completed') },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

/** What goes under the heading: a wait, a message, or the stories. */
function StoriesBody({
  writing,
  filter,
  chapterNumbers,
}: {
  writing: ReturnType<typeof useMyStories>;
  filter: StatusFilter;
  chapterNumbers: DashboardChapter[];
}) {
  const { t } = useTranslation('writing');
  if (!writing.isKnown) return null;
  if (!writing.isSignedIn)
    return <p className="m-0 text-ink-muted">{t('yourWriting.signedOut')}</p>;
  if (writing.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  const stories = liveStoriesFor(writing.stories, filter);
  if (stories.length === 0) {
    return (
      <EmptyState
        title={t(filter === 'all' ? 'yourWriting.empty.title' : 'yourWriting.empty.filteredTitle')}
        description={t('yourWriting.empty.description')}
        action={<NewStoryLink label={t('yourWriting.empty.action')} look="main" />}
      />
    );
  }
  // Automatic covers come from each story's ID; two neighbours never share a design (S1-E3-13).
  const covers = designsForRow(stories);
  return (
    <div className="flex flex-col">
      {stories.map((story, index) => (
        <WriterStoryCard
          key={story.id}
          story={story}
          cover={covers[index] ?? automaticCoverFor(story.id)}
          chapterNumbers={chapterNumbers.filter((chapter) => chapter.storySlug === story.slug)}
        />
      ))}
    </div>
  );
}

/**
 * The page's header (board D01, user story 5.1): the title, the line under it, then "Continue
 * draft", "New story" and "Story Atlas" in a row under them, at the left.
 */
function YourWritingHeader({
  isSignedIn,
  chapters,
}: {
  isSignedIn: boolean;
  chapters: DashboardChapter[];
}) {
  const { t } = useTranslation('writing');
  return (
    <header className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="m-0 type-display text-ink-heading">{t('yourWriting.heading')}</h1>
        <p className="m-0 max-w-[62ch] type-body text-ink-muted">{t('yourWriting.intro')}</p>
      </div>
      {isSignedIn && (
        <div className="flex flex-wrap items-center gap-3">
          <ContinueDraftLink chapters={chapters} />
          <NewStoryLink label={t('yourWriting.newStory')} look="quiet" />
          <StoryAtlasLink />
        </div>
      )}
    </header>
  );
}

/** "Story by story": the heading with the status filter at its right, then the stories. */
function StoriesSection({
  writing,
  chapterNumbers,
}: {
  writing: ReturnType<typeof useMyStories>;
  chapterNumbers: DashboardChapter[];
}) {
  const { t } = useTranslation('writing');
  const [filter, setFilter] = useState<StatusFilter>('all');
  return (
    <section aria-labelledby="writing-stories-heading" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id="writing-stories-heading" className="m-0 type-heading text-ink-heading">
          {t('yourWriting.storiesHeading')}
        </h2>
        {writing.isSignedIn && <StatusFilterSwitch value={filter} onChange={setFilter} />}
      </div>
      <StoriesBody writing={writing} filter={filter} chapterNumbers={chapterNumbers} />
    </section>
  );
}

/** Story titles by slug, for the dashboard's draft rows. */
function titlesBySlug(stories: MyStory[]): Map<string, string> {
  return new Map(stories.map((story) => [story.slug, story.title]));
}

/** The dashboard's upper half, shown once the writer has a live story. */
function DashboardTopWhenReady({
  dashboard,
  loadFailed,
  stories,
  period,
  onPeriodChange,
}: {
  dashboard: WriterDashboard | null;
  loadFailed: boolean;
  stories: MyStory[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  const { t } = useTranslation('writing');
  if (loadFailed) return <Notice tone="error">{t('dashboard.loadFailed')}</Notice>;
  if (dashboard === null) return null;
  return (
    <WriterDashboardTop
      dashboard={dashboard}
      period={period}
      onPeriodChange={onPeriodChange}
      storyTitles={titlesBySlug(stories)}
    />
  );
}

/**
 * The dashboard's lower half (board D01): "Lines and stops" beside "Latest comments" from 1024 px,
 * then the page's second advert (slot write_lower; staff turn it off or book it in Sponsors ›
 * Placements).
 *
 * @param props.dashboard - the numbers and the latest comments
 * @param props.stories - the live stories, for the chapter titles
 * @returns the two sections and the advert
 */
function DashboardLowerHalf({
  dashboard,
  stories,
}: {
  dashboard: WriterDashboard;
  stories: MyStory[];
}) {
  return (
    <>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <ChapterInsights chapters={dashboard.chapters} storyTitles={titlesBySlug(stories)} />
        <LatestComments
          comments={dashboard.latestComments}
          totalComments={allTimeCommentCount(dashboard.chapters)}
        />
      </div>
      <PageAdSlot pageKey="write" position={2} className="mx-auto w-full max-w-[970px]" />
    </>
  );
}

/**
 * What NewStoryPage said on the way here (router state): a story was just created, or its first
 * chapter couldn't be made.
 *
 * @returns justCreated and chapterFailed
 */
function useArrivalNotices() {
  const location = useLocation() as {
    state?: { createdSlug?: string; chapterFailed?: boolean } | null;
  };
  return {
    justCreated: typeof location.state?.createdSlug === 'string',
    chapterFailed: location.state?.chapterFailed === true,
  };
}

/**
 * Renders the page.
 *
 * @returns the Your writing screen
 */
export function YourWritingPage() {
  const { t } = useTranslation('writing');
  const writing = useMyStories();
  // The figures open on the last 30 days, as board D01 draws them (user story 5.1).
  const [period, setPeriod] = useState<DashboardPeriod>('last_30_days');
  const { dashboard, loadFailed } = useWriterDashboard(period);
  const { justCreated, chapterFailed } = useArrivalNotices();
  const liveStories = liveStoriesFor(writing.stories, 'all');
  const deletedStories = writing.stories.filter((story) => story.deletedAt !== null);
  const chapters = dashboard?.chapters ?? [];
  const hasStories = writing.isSignedIn && liveStories.length > 0;

  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-12 pb-6">
      <title>{t('yourWriting.documentTitle')}</title>
      <YourWritingHeader isSignedIn={writing.isSignedIn} chapters={chapters} />
      {justCreated && <Notice tone="success">{t('yourWriting.created')}</Notice>}
      {chapterFailed && <Notice tone="warning">{t('errors.chapterCreateFailed')}</Notice>}
      {hasStories && (
        <DashboardTopWhenReady
          dashboard={dashboard}
          loadFailed={loadFailed}
          stories={liveStories}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
      <StoriesSection writing={writing} chapterNumbers={chapters} />
      {hasStories && dashboard !== null && (
        <DashboardLowerHalf dashboard={dashboard} stories={liveStories} />
      )}
      <RecentlyDeleted stories={deletedStories} />
    </PageContainer>
  );
}
