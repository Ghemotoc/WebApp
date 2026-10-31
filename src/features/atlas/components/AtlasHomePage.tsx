/**
 * AtlasHomePage: /plan, the way into Story Atlas (stories S1-E17-01 and S1-E17-02).
 *
 * It opens the story the writer had open last on this device, or their newest story; a writer
 * with no stories yet gets "Plan your first story" with New story, which comes back to the new
 * story's plan (S1-E17-01).
 * Who calls it: src/app/router.tsx. What it calls: useMyStories, lib/lastPlannedStory.ts.
 */
import { Link, Navigate } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { lastPlannedStory, storyToOpen } from '../lib/lastPlannedStory';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the page, or sends the writer on to a story's plan.
 *
 * @returns a redirect, the empty state or a plain message
 */
export function AtlasHomePage() {
  const { t } = useAtlasTranslation();
  const { stories, isSignedIn, isKnown } = useMyStories();
  if (!isKnown) return null;
  // Newest first, as Your writing lists them; deleted stories have no plan to open.
  const liveSlugs = stories.filter((story) => story.deletedAt === null).map((story) => story.slug);
  const slug = isSignedIn ? storyToOpen(liveSlugs, lastPlannedStory()) : null;
  if (slug !== null) return <Navigate to={`/plan/s/${slug}`} replace />;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-10 pb-12">
      <title>{t('homeDocumentTitle')}</title>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      {isSignedIn ? (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link
              to="/write/new?from=plan"
              className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
            >
              {t('empty.action')}
            </Link>
          }
        />
      ) : (
        <p className="m-0 text-body">{t('signedOut')}</p>
      )}
    </PageContainer>
  );
}
