/**
 * YourWritingPage: "Your writing", the writer's own stories, screen 4.1's lower half (story
 * S1-E3-01; design/boards/WriterDashboard.dc.html).
 *
 * Who shows it: the router, at /write; the top bar's "Write" button leads here.
 * What it shows: the header with "+ New story", then "Story by story" with one WriterStoryCard
 * per live story (filtered by Ongoing or Completed, S1-E3-05), or an empty state, and "Recently
 * deleted" with undo when a story was deleted in the last 30 days (S1-E3-05). The board's
 * statistics tiles, followers chart, drafts list and latest comments are the writer dashboard
 * proper (S1-E3-07, after March) and stay out.
 * What it calls: useMyStories (stories through stories_select_own). After creating a story,
 * NewStoryPage lands here with a "saved" notice (router state).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Doodle } from '@/components/ui/Doodle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MyStory } from '../api/stories';
import { useMyStories } from '../hooks/useMyStories';

import { RecentlyDeleted } from './RecentlyDeleted';
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

/** The "+ New story" button, a link drawn as the primary button. */
function NewStoryLink({ label }: { label: string }) {
  return (
    <Link
      to="/write/new"
      className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-[15px] font-semibold whitespace-nowrap text-on-primary no-underline hover:opacity-90"
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
}: {
  writing: ReturnType<typeof useMyStories>;
  filter: StatusFilter;
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
        />
      ))}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Your writing screen
 */
export function YourWritingPage() {
  const { t } = useTranslation('writing');
  const writing = useMyStories();
  const location = useLocation() as { state?: { createdSlug?: string } | null };
  const justCreated = typeof location.state?.createdSlug === 'string';
  const [filter, setFilter] = useState<StatusFilter>('all');
  const deletedStories = writing.stories.filter((story) => story.deletedAt !== null);

  return (
    <PageContainer className="tmc-rise flex flex-col gap-10 pt-12 pb-7">
      <title>{t('yourWriting.documentTitle')}</title>
      <header className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-[640px] flex-col gap-2">
          <Eyebrow>{t('yourWriting.eyebrow')}</Eyebrow>
          <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
            {t('yourWriting.heading')}
          </h1>
          <p className="m-0 text-lg leading-[1.6] text-body">{t('yourWriting.intro')}</p>
        </div>
        {writing.isSignedIn && <NewStoryLink label={t('yourWriting.newStory')} />}
        <Doodle
          name="typewriter"
          kind="background"
          hideBelow="wide"
          className="absolute -top-4 right-[260px] w-28 -rotate-6"
        />
      </header>
      {justCreated && <Notice tone="success">{t('yourWriting.created')}</Notice>}
      <section className="flex flex-col gap-5">
        <div className="relative flex flex-col gap-1 pr-24">
          <Eyebrow>{t('yourWriting.storiesEyebrow')}</Eyebrow>
          <h2 className="m-0 font-heading text-[30px] font-bold text-heading">
            {t('yourWriting.storiesHeading')}
          </h2>
          {/* The pencil cup sits at the row's far right, inside the padding the text never uses. */}
          <Doodle
            name="pencil-cup"
            kind="widget"
            on="Story by story"
            hideBelow="phone"
            className="absolute top-0 right-2 w-16"
          />
        </div>
        {writing.isSignedIn && <StatusFilterChips value={filter} onChange={setFilter} />}
        <StoriesBody writing={writing} filter={filter} />
      </section>
      <RecentlyDeleted stories={deletedStories} />
    </PageContainer>
  );
}
