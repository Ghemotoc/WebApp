/**
 * AtlasHomePage: /plan, the way into Story Atlas (stories S1-E17-01 and S1-E17-02; bundle G10
 * ATLAS, part a: the liquid glass board AtlasHome, handoff A1).
 *
 * "Story plans": one glass card per live story (the writing status, genre, title, logline and
 * words against the target), the one opened last on this device first, then a dashed "Plan a new
 * story" card. "New story" sits beside the heading. Both go to the usual New story form, which
 * comes back to the new story's plan (S1-E17-01). A writer with no stories yet gets "Plan a first
 * story". Only the writer sees any of it.
 * Who calls it: src/app/router.tsx. What it calls: useMyStories (titles and covers),
 * useMyStoryPlans → my_story_plans() (the plans' own fields), lib/lastPlannedStory.ts.
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
import { lastPlannedStory, storyToOpen } from '../lib/lastPlannedStory';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { StoryPlanCard } from './StoryPlanCard';

/** Where New story goes: the usual form, coming back to the new story's plan (S1-E17-01). */
const newStoryAddress = '/write/new?from=plan';

/** One card's story and plan together. */
interface PlanCardData {
  story: MyStory;
  plan: StoryPlanSummary;
}

/**
 * Joins each plan to its story and puts the one opened last on this device first (S1-E17-02:
 * "/plan opens the story open last" became "comes first" with the list of plans, G10a).
 *
 * @param stories - the writer's stories (deleted ones are left out)
 * @param plans - the plans, the one changed last first
 * @returns the cards' data in the order they show
 */
function cardsInOrder(stories: MyStory[], plans: StoryPlanSummary[]): PlanCardData[] {
  const cards: PlanCardData[] = [];
  for (const plan of plans) {
    const story = stories.find((candidate) => candidate.slug === plan.slug);
    if (story !== undefined && story.deletedAt === null) cards.push({ story, plan });
  }
  const openedLast = storyToOpen(
    cards.map((card) => card.story.slug),
    lastPlannedStory(),
  );
  const first = cards.filter((card) => card.story.slug === openedLast);
  const rest = cards.filter((card) => card.story.slug !== openedLast);
  return [...first, ...rest];
}

/** The dashed card at the end of the list. */
function NewPlanCard() {
  const { t } = useAtlasTranslation();
  return (
    <Link
      to={newStoryAddress}
      className="flex min-h-40 flex-col items-center justify-center gap-2.5 rounded-card border-2 border-dashed border-control-border p-[18px] font-semibold text-heading no-underline hover:bg-tint"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 items-center justify-center rounded-full button-glass"
      >
        <ActionIcon name="plus" />
      </span>
      {t('home.newPlan')}
    </Link>
  );
}

/** The heading, the lead line and New story. */
function HomeHeader() {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[60ch] flex-col gap-2">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h1 className="m-0 font-heading text-[clamp(36px,5vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] text-heading">
            {t('home.heading')}
          </h1>
          <p className="m-0 text-[17px] leading-normal text-body">{t('home.lead')}</p>
        </div>
        <Link
          to={newStoryAddress}
          className="inline-flex h-12 items-center gap-2 rounded-full button-glass px-6 font-semibold no-underline"
        >
          <ActionIcon name="plus" />
          {t('switcher.newStory')}
        </Link>
      </div>
      <p className="m-0 inline-flex items-center gap-1.5 text-sm text-meta">
        <ActionIcon name="lock" size={14} />
        {t('home.privateNote')}
      </p>
    </div>
  );
}

/** The cards, or the first-story invitation for a writer with none yet. */
function PlanCards({ cards }: { cards: PlanCardData[] }) {
  const { t } = useAtlasTranslation();
  if (cards.length === 0) {
    return (
      <EmptyState
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Link
            to={newStoryAddress}
            className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
          >
            {t('empty.action')}
          </Link>
        }
      />
    );
  }
  // Automatic covers come from each story's ID; two neighbours never share a design (S1-E3-13).
  const covers = designsForRow(cards.map((card) => card.story));
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {cards.map((card, index) => (
        <StoryPlanCard
          key={card.story.id}
          story={card.story}
          plan={card.plan}
          cover={covers[index] ?? automaticCoverFor(card.story.id)}
        />
      ))}
      <NewPlanCard />
    </div>
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
    <PageContainer className="tmc-rise flex flex-col gap-7 pt-10 pb-12">
      <title>{t('homeDocumentTitle')}</title>
      {!isSignedIn && (
        <>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <p className="m-0 text-body">{t('signedOut')}</p>
        </>
      )}
      {isSignedIn && <HomeHeader />}
      {isSignedIn && loadFailed && <Notice tone="error">{t('home.loadFailed')}</Notice>}
      {isSignedIn && plans !== undefined && <PlanCards cards={cardsInOrder(stories, plans)} />}
    </PageContainer>
  );
}
