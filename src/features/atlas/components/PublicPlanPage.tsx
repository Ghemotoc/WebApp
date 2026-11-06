/**
 * PublicPlanPage: /s/:storySlug/atlas/:area and /s/:storySlug/atlas/characters/:characterId,
 * the parts of a story's plan its writer shares with readers (story S1-E17-33).
 *
 * A heading with the story's title (a link back to its page), then PublicPlanView. The database
 * decides what this reader may see (get_public_story_plan(): the story's rating, blocks,
 * moderation and the writer's switches, S1-E17-32 to S1-E17-35); an area that is off or a story
 * the reader may not read gets the same plain message. No doodles: plain reading pages.
 * Who calls it: src/app/router.tsx. What it calls: usePublicPlan and PublicPlanView.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { PlanArea, PublicPlan } from '../api/publicPlan';
import { usePublicPlan } from '../hooks/usePublicPlan';
import { areaFromPath, readerPlanBase } from '../lib/publicPlanAreas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PublicPlanView } from './PublicPlanView';

/** The heading and the area, once the reader may see it. */
function PublicPlanBody({
  plan,
  area,
  characterId,
}: {
  plan: PublicPlan;
  area: PlanArea;
  characterId: string | undefined;
}) {
  const { t } = useAtlasTranslation();
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="m-0 eyebrow">{t('publicPlan.eyebrow')}</p>
        <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          <Link to={`/s/${plan.storySlug}`} className="text-heading no-underline hover:underline">
            {plan.storyTitle}
          </Link>
        </h1>
      </header>
      <PublicPlanView
        plan={plan}
        area={area}
        characterId={characterId}
        base={readerPlanBase(plan.storySlug)}
        isPreview={false}
      />
    </>
  );
}

/**
 * The area to show, or null when the area is off, unknown or the plan isn't readable.
 *
 * @returns the area readers may open
 */
function shownArea(plan: PublicPlan | null | undefined, area: PlanArea | null): PlanArea | null {
  if (!plan || area === null) return null;
  return plan.areas.includes(area) ? area : null;
}

/**
 * Renders the page.
 *
 * @returns the readers' page, a wait or a plain message
 */
export function PublicPlanPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '', areaPath, characterId } = useParams();
  const { plan, loadFailed } = usePublicPlan(storySlug);
  // Step 1: the area from the address, kept only when the writer turned it on.
  const area = shownArea(plan, areaFromPath(areaPath));
  // Step 2: the tab's title names the area and the story, or says there is nothing to see.
  const title =
    plan && area !== null
      ? t('publicPlan.documentTitle', {
          area: t(`publicPlan.areas.${area}`),
          title: plan.storyTitle,
        })
      : t('publicPlan.notFound');
  const isMissing = plan === null || (plan !== undefined && area === null);
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>{title}</title>
      {loadFailed && <Notice tone="error">{t('publicPlan.loadFailed')}</Notice>}
      {isMissing && <Notice tone="error">{t('publicPlan.notFound')}</Notice>}
      {plan && area !== null && (
        <PublicPlanBody plan={plan} area={area} characterId={characterId} />
      )}
    </PageContainer>
  );
}
