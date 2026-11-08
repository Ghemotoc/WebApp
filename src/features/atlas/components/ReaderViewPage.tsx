/**
 * ReaderViewPage: /plan/s/:storySlug/readers, "What readers can see" in Story Atlas (story
 * S1-E17-32).
 *
 * The Story Atlas top bar, the heading, a short line on how it works (nothing is public until an
 * area is on; items stay back with "Keep private" on their own pages; a chapter can hold an item
 * back until readers reach it), whether the story is published yet, the five area switches and
 * "Preview as a reader". Only the writer sees it.
 * Who calls it: src/app/router.tsx. What it calls: usePlanVisibility, usePlanPreview (whether
 * the story is published), PublicAreaSwitches and AtlasTopBar.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { usePlanPreview } from '../hooks/usePlanPreview';
import { usePlanVisibility } from '../hooks/usePlanVisibility';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { PublicAreaSwitches } from './PublicAreaSwitches';

/** The page's text, switches and preview link, once the settings have loaded. */
function ReaderViewBody({ slug, title }: { slug: string; title: string }) {
  const { t } = useAtlasTranslation();
  const { visibility, saveAreas } = usePlanVisibility(slug);
  const { preview } = usePlanPreview(slug);
  if (!visibility) return null;
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          {t('readers.heading')}
        </h1>
        <p className="m-0 text-sm text-meta">{title}</p>
      </header>
      <div className="flex max-w-[70ch] flex-col gap-3 text-body">
        <p className="m-0">{t('readers.intro')}</p>
        <p className="m-0">{t('readers.introItems')}</p>
      </div>
      {preview && !preview.isPublished && <Notice tone="info">{t('readers.notPublished')}</Notice>}
      <PublicAreaSwitches savedAreas={visibility.areas} save={saveAreas} />
      <Link
        to={`/plan/s/${slug}/preview`}
        className="inline-flex h-11 items-center self-start rounded-full button-main px-6 font-semibold no-underline"
      >
        {t('readers.previewLink')}
      </Link>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the settings page, a wait or a plain message
 */
export function ReaderViewPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { visibility, loadFailed } = usePlanVisibility(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);
  const storyTitle = story?.title ?? '';

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>{t('readers.documentTitle', { title: storyTitle })}</title>
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="readers" />
      )}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {visibility === null && <Notice tone="error">{t('notFound')}</Notice>}
      {visibility && <ReaderViewBody slug={storySlug} title={storyTitle} />}
    </PageContainer>
  );
}
