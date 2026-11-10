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
 * update_story_marketing(); MarketingFields and BackCoverPreview (signed with the writer's name
 * from useMyNames); useScrollToHash for a field opened from a search result; useMyStories for the
 * top bar.
 */
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { MarketingNotes } from '../api/marketing';
import type { StoryPlanPage } from '../api/storyPlans';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { useStoryMarketing } from '../hooks/useStoryMarketing';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasTopBar } from './AtlasTopBar';
import { BackCoverPreview } from './BackCoverPreview';
import { MarketingFields } from './MarketingFields';
import { StoryQrCard } from './StoryQrCard';

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
  // The name the back cover is signed with: the pen name, or the username without one.
  const { names } = useMyNames();
  const writerName = names?.penName ?? names?.handle ?? '';
  // "#atlas-marketing-<field>" (from a search result) brings that field into view.
  useScrollToHash(true);
  return (
    <>
      <AtlasPageHeading title={t('marketing.heading')} />
      {/* Board AtlasMarketing: the fields and the QR code on the left, the back cover beside
          them from 1024 px and under them on smaller screens. */}
      <div className="flex min-w-0 flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <MarketingFields
            slug={slug}
            page={page}
            notes={notes}
            savePlan={savePlan}
            saveStory={saveStory}
            saveNote={save}
          />
          <StoryQrCard slug={slug} />
        </div>
        <aside className="flex min-w-0 flex-col lg:w-[420px] lg:shrink-0">
          <BackCoverPreview
            text={{
              title: page.story.title,
              logline: page.plan.logline,
              blurb: notes.back_cover_blurb,
              comparableTitles: notes.comparable_titles,
              writerName,
            }}
          />
        </aside>
      </div>
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
