/**
 * YourWritingPage: "Your writing", the writer's own stories, screen 4.1's lower half (story
 * S1-E3-01; design/boards/WriterDashboard.dc.html).
 *
 * Who shows it: the router, at /write; the top bar's "Write" button leads here.
 * What it shows: the header with "+ New story", then "Story by story" with one WriterStoryCard
 * per live story (filtered by Ongoing or Completed, S1-E3-05), or an empty state, and "Recently
 * deleted" with undo when a story was deleted in the last 30 days (S1-E3-05). Once the writer has
 * a story, the writer dashboard (S1-E3-07) joins it: "Continue draft" in the header, the tiles,
 * followers chart and drafts list above the stories (WriterDashboardTop), a numbers table in each
 * story card and "Latest on your chapters" below. Between the two sits "Lines and stops"
 * (ChapterInsights, bundle IDEAS-1 part d): one chapter's most-loved lines and where readers stop.
 * What it calls: useMyStories (stories through stories_select_own) and useWriterDashboard
 * (writer_dashboard()). After creating a story, NewStoryPage lands here with a "saved" notice
 * (router state).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { DashboardChapter, DashboardPeriod, WriterDashboard } from '../api/dashboard';
import type { MyStory } from '../api/stories';
import { useMyStories } from '../hooks/useMyStories';
import { useWriterDashboard } from '../hooks/useWriterDashboard';
import { waitingChapters } from '../lib/dashboardChapters';

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

/** The board's "Continue draft": the most recently saved draft or scheduled chapter's editor. */
function ContinueDraftLink({ chapters }: { chapters: DashboardChapter[] }) {
  const { t } = useTranslation('writing');
  const latest = waitingChapters(chapters).find((chapter) => chapter.status === 'draft');
  if (latest === undefined) return null;
  return (
    <Link
      to={`/write/s/${latest.storySlug}/c/${latest.chapterCode}`}
      className="inline-flex h-12 items-center rounded-full button-glass px-6 text-[15px] font-semibold whitespace-nowrap no-underline"
    >
      {t('dashboard.continueDraft')}
    </Link>
  );
}

/** The "+ New story" button, a link drawn as the primary button. */
function NewStoryLink({ label }: { label: string }) {
  return (
    <Link
      to="/write/new"
      className="inline-flex h-12 items-center rounded-full button-main px-6 text-[15px] font-semibold whitespace-nowrap no-underline"
    >
      {label}
    </Link>
  );
}

/** The Ongoing / Completed filter chips ("Readers can filter by it"; the writer can too). */
function StatusFilterChips({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <ChoiceChips
      label={t('status.filterLabel')}
      options={[
        { value: 'all', label: t('status.all') },
        { value: 'ongoing', label: t('status.ongoing') },
        { value: 'completed', label: t('status.completed') },
      ]}
      value={value}
      onChange={(next) => onChange(next as StatusFilter)}
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
  if (!writing.isSignedIn) return <p className="m-0 text-body">{t('yourWriting.signedOut')}</p>;
  if (writing.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  const stories = liveStoriesFor(writing.stories, filter);
  if (stories.length === 0) {
    return (
      <EmptyState
        title={t(filter === 'all' ? 'yourWriting.empty.title' : 'yourWriting.empty.filteredTitle')}
        description={t('yourWriting.empty.description')}
        action={<NewStoryLink label={t('yourWriting.empty.action')} />}
      />
    );
  }
  // Automatic covers come from each story's ID; two neighbours never share a design (S1-E3-13).
  const covers = designsForRow(stories);
  return (
    <div className="flex flex-col gap-5">
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

/** The page's header: eyebrow, heading, intro, "Continue draft" and "+ New story". */
function YourWritingHeader({
  isSignedIn,
  chapters,
}: {
  isSignedIn: boolean;
  chapters: DashboardChapter[];
}) {
  const { t } = useTranslation('writing');
  return (
    <header className="relative flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[640px] flex-col gap-2">
        <Eyebrow>{t('yourWriting.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('yourWriting.heading')}
        </h1>
        <p className="m-0 text-lg leading-[1.6] text-body">{t('yourWriting.intro')}</p>
      </div>
      {isSignedIn && (
        <div className="flex flex-wrap gap-3">
          <ContinueDraftLink chapters={chapters} />
          <NewStoryLink label={t('yourWriting.newStory')} />
        </div>
      )}
    </header>
  );
}

/** "Story by story": the heading, the status filter and the stories with their numbers. */
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
    <section className="flex flex-col gap-5">
      <div className="relative flex flex-col gap-1 pr-24">
        <Eyebrow>{t('yourWriting.storiesEyebrow')}</Eyebrow>
        <h2 className="m-0 font-heading text-[30px] font-bold text-heading">
          {t('yourWriting.storiesHeading')}
        </h2>
      </div>
      {writing.isSignedIn && <StatusFilterChips value={filter} onChange={setFilter} />}
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
  const [period, setPeriod] = useState<DashboardPeriod>('all');
  const { dashboard, loadFailed } = useWriterDashboard(period);
  const { justCreated, chapterFailed } = useArrivalNotices();
  const liveStories = liveStoriesFor(writing.stories, 'all');
  const deletedStories = writing.stories.filter((story) => story.deletedAt !== null);
  const chapters = dashboard?.chapters ?? [];
  const hasStories = writing.isSignedIn && liveStories.length > 0;

  return (
    <PageContainer className="tmc-rise flex flex-col gap-10 pt-12 pb-7">
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
        <>
          <ChapterInsights chapters={chapters} storyTitles={titlesBySlug(liveStories)} />
          <LatestComments comments={dashboard.latestComments} />
        </>
      )}
      <RecentlyDeleted stories={deletedStories} />
    </PageContainer>
  );
}
