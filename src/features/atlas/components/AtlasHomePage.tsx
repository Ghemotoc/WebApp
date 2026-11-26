/**
 * AtlasHomePage: /plan, the way into Story Atlas (stories S1-E17-01 and S1-E17-02; redrawn as
 * board E20 in user stories bundle 6, story 6.1).
 *
 * "Story Atlas", its lead line and New story, the private note, then "7 stories / Most recently
 * edited first." over one row per live story (StoryPlanRow): every story has a plan, published or
 * not, and the newest edit comes first (story 6.1; my_story_plans() sorts them). A row's title
 * opens that story's plan on At a glance. New story goes to the usual New story form, which comes
 * back to the new story's plan (S1-E17-01). A writer with no stories yet gets "Plan a first
 * story". Only the writer sees any of it.
 * Who calls it: src/app/router.tsx. What it calls: useMyStories (titles, genres and covers),
 * useMyStoryPlans → my_story_plans() (the plans' own fields), StoryPlanRow.
 */
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryPlanSummary } from '../api/storyPlanList';
import { useMyStoryPlans } from '../hooks/useMyStoryPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { StoryPlanRow } from './StoryPlanRow';

/** Where New story goes: the usual form, coming back to the new story's plan (S1-E17-01). */
const newStoryAddress = '/write/new?from=plan';

/** One row's story and plan together. */
interface PlanRowData {
  story: MyStory;
  plan: StoryPlanSummary;
}

/**
 * Joins each plan to its story, keeping the server's order (the newest edit first, story 6.1).
 *
 * @param stories - the writer's stories (deleted ones are left out)
 * @param plans - the plans, the newest edit first
 * @returns the rows' data in the order they show
 */
function rowsInOrder(stories: MyStory[], plans: StoryPlanSummary[]): PlanRowData[] {
  const rows: PlanRowData[] = [];
  for (const plan of plans) {
    const story = stories.find((candidate) => candidate.slug === plan.slug);
    if (story !== undefined && story.deletedAt === null) rows.push({ story, plan });
  }
  return rows;
}

/** The title, the lead line, New story and the private note (board E20's header). */
function HomeHeader() {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="m-0 type-title lg:type-display text-ink-heading">{t('home.heading')}</h1>
        <p className="m-0 mt-2 max-w-[60ch] type-body text-ink-muted">{t('home.lead')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to={newStoryAddress}
            className="inline-flex h-11 items-center gap-2 rounded-full button-main px-6 type-body font-semibold no-underline"
          >
            <ActionIcon name="plus" />
            {t('switcher.newStory')}
          </Link>
        </div>
      </header>
      <p className="m-0 inline-flex items-center gap-2 type-meta">
        <ActionIcon name="lock" size={14} />
        {t('home.privateNote')}
      </p>
    </div>
  );
}

/** The first-story invitation for a writer with no stories yet. */
function NoPlansYet() {
  const { t } = useAtlasTranslation();
  return (
    <EmptyState
      title={t('empty.title')}
      description={t('empty.description')}
      action={
        <Link
          to={newStoryAddress}
          className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
        >
          {t('empty.action')}
        </Link>
      }
    />
  );
}

/** "7 stories", "Most recently edited first." and the rows. */
function PlanList({ rows }: { rows: PlanRowData[] }) {
  const { t } = useAtlasTranslation();
  if (rows.length === 0) return <NoPlansYet />;
  // Automatic covers come from each story's ID; two neighbours never share a design (S1-E3-13).
  const covers = designsForRow(rows.map((row) => row.story));
  return (
    <section aria-labelledby="atlas-plan-list-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="atlas-plan-list-heading" className="m-0 type-heading text-ink-heading">
          {t('home.count', { count: rows.length })}
        </h2>
        <p className="m-0 mt-1 type-meta">{t('home.order')}</p>
      </div>
      <ul aria-label={t('home.listLabel')} className="m-0 list-none p-0">
        {rows.map((row, index) => (
          <StoryPlanRow
            key={row.story.id}
            story={row.story}
            plan={row.plan}
            cover={covers[index] ?? automaticCoverFor(row.story.id)}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the list of plans, a wait or a plain message
 */
export function AtlasHomePage() {
  const { t } = useAtlasTranslation();
  const { stories, isSignedIn, isKnown } = useMyStories();
  const { plans, loadFailed } = useMyStoryPlans();
  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-8 pb-12">
      <title>{t('homeDocumentTitle')}</title>
      {!isSignedIn && (
        <>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <p className="m-0 text-ink-muted">{t('signedOut')}</p>
        </>
      )}
      {isSignedIn && <HomeHeader />}
      {isSignedIn && loadFailed && <Notice tone="error">{t('home.loadFailed')}</Notice>}
      {isSignedIn && plans !== undefined && <PlanList rows={rowsInOrder(stories, plans)} />}
    </PageContainer>
  );
}
