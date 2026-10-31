/**
 * MarketingPage: /plan/s/:storySlug/marketing, a story's marketing notes in Story Atlas (story
 * S1-E17-29).
 *
 * The Story Atlas top bar, the heading, the fields (each saving by itself), then "Back cover",
 * the preview of the title, logline, blurb and comparable titles. The logline, genre, audience
 * and publishing route are the same fields as At a glance (one place for both); the rest are the
 * marketing notes. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryPlan → story_plan() and its savers; useStoryMarketing → story_marketing() and
 * update_story_marketing(); MarketingFields and BackCoverPreview; useMyStories for the top bar.
 */
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { MarketingNotes } from '../api/marketing';
import type { StoryPlanPage } from '../api/storyPlans';
import { useStoryMarketing } from '../hooks/useStoryMarketing';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { BackCoverPreview } from './BackCoverPreview';
import { MarketingFields } from './MarketingFields';

/** The heading, the fields and the back cover, once both reads have answered. */
function MarketingBody({
  slug,
  page,
  notes,
}: {
  slug: string;
  page: StoryPlanPage;
  notes: MarketingNotes;
}) {
  const { t } = useAtlasTranslation();
  const { savePlan, saveStory } = useStoryPlan(slug);
  const { save } = useStoryMarketing(slug);
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          {t('marketing.heading')}
        </h1>
        <p className="m-0 text-sm text-meta">
          {page.story.title} · {t('privateNote')}
        </p>
      </header>
      <MarketingFields
        page={page}
        notes={notes}
        savePlan={savePlan}
        saveStory={saveStory}
        saveNote={save}
      />
      <BackCoverPreview
        text={{
          title: page.story.title,
          logline: page.plan.logline,
          blurb: notes.back_cover_blurb,
          comparableTitles: notes.comparable_titles,
        }}
      />
    </>
  );
}

/** The plain messages: signed out, a failed read or a story that isn't the writer's. */
function MarketingMessages({
  isSignedIn,
  loadFailed,
  isNotFound,
}: {
  isSignedIn: boolean;
  loadFailed: boolean;
  isNotFound: boolean;
}) {
  const { t } = useAtlasTranslation();
  return (
    <>
      {!isSignedIn && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {isNotFound && <Notice tone="error">{t('notFound')}</Notice>}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Marketing page, a wait or a plain message
 */
export function MarketingPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const plan = useStoryPlan(storySlug);
  const marketing = useStoryMarketing(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);
  // The page needs both reads; either one saying "not the writer's" means not found.
  const isNotFound = plan.page === null || marketing.notes === null;
  const title = plan.page ? t('marketing.documentTitle', { title: plan.page.story.title }) : null;

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>{title ?? t('homeDocumentTitle')}</title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="marketing" />
      )}
      <MarketingMessages
        isSignedIn={userId !== null}
        loadFailed={plan.loadFailed || marketing.loadFailed}
        isNotFound={isNotFound}
      />
      {plan.page && marketing.notes && (
        <MarketingBody slug={storySlug} page={plan.page} notes={marketing.notes} />
      )}
    </PageContainer>
  );
}
