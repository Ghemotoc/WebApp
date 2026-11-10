/**
 * PlanPreviewPage: /plan/s/:storySlug/preview/:area, "Preview as a reader" (story S1-E17-32:
 * "when I open it, then I see exactly what a reader would see").
 *
 * The Story Atlas top bar, the same band readers get with the story's cover, title and writer's
 * name (PublicPlanHero), a
 * line saying this is a preview (and, before publishing, that readers can't see any of it yet),
 * then the same PublicPlanView readers get, with the items that wait
 * for a chapter marked instead of left out (S1-E17-35) and no Report buttons. Only the writer
 * sees it. Who calls it: src/app/router.tsx. What it calls: usePlanPreview, PublicPlanHero,
 * PublicPlanView and AtlasTopBar.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { PublicPlan } from '../api/publicPlan';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { areaFromPath } from '../lib/publicPlanAreas';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { PublicPlanHero } from './PublicPlanHero';
import { PublicPlanView } from './PublicPlanView';

/** The preview's note, then the view of the open area (the first public one by default). */
function PreviewBody({
  slug,
  plan,
  isPublished,
}: {
  slug: string;
  plan: PublicPlan;
  isPublished: boolean;
}) {
  const { t } = useAtlasTranslation();
  const { areaPath, itemId } = useParams();
  const area = areaFromPath(areaPath) ?? plan.areas[0] ?? null;
  return (
    <>
      <Notice tone="info">
        {isPublished ? t('readers.preview.note') : t('readers.preview.notPublished')}
      </Notice>
      {area === null || !plan.areas.includes(area) ? (
        <p className="m-0 text-body">
          {t('readers.preview.nothing')}{' '}
          <Link to={`/plan/s/${slug}/readers`} className="font-semibold text-link">
            {t('readers.item.settingsLink')}
          </Link>
        </p>
      ) : (
        <PublicPlanView
          plan={plan}
          area={area}
          itemId={itemId}
          base={`/plan/s/${slug}/preview`}
          isPreview
        />
      )}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the preview, a wait or a plain message
 */
export function PlanPreviewPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { preview, loadFailed } = usePlanPreview(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>{t('readers.preview.documentTitle', { title: story?.title ?? '' })}</title>
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="readers" />
      )}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {preview === null && <Notice tone="error">{t('notFound')}</Notice>}
      {preview && (
        <>
          <PublicPlanHero plan={preview.plan} storyAddress={null} />
          <PreviewBody slug={storySlug} plan={preview.plan} isPublished={preview.isPublished} />
        </>
      )}
    </PageContainer>
  );
}
