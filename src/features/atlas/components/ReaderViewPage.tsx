/**
 * ReaderViewPage: /plan/s/:storySlug/readers, "What readers can see" in Story Atlas (story
 * S1-E17-32).
 *
 * The Story Atlas top bar, the heading and a short line on how it works, whether the story is
 * published yet, then two columns from large screens (board AtlasReaders, G10c4): the five area
 * switches and every character with what readers see of it on the left; "Spoilers stay safe" and
 * "Preview as a reader" on the right. Only the writer sees it.
 * Who calls it: src/app/router.tsx. What it calls: usePlanVisibility, usePlanPreview (whether
 * the story is published), PublicAreaSwitches, ReaderCharactersList and AtlasTopBar.
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
import { ReaderCharactersList } from './ReaderCharactersList';

/** "Spoilers stay safe": how the chapter guard works, with the way to the preview. */
function SpoilerAside({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  return (
    <aside
      aria-labelledby="atlas-reader-spoilers"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-5 py-5 shadow-card md:px-7 lg:sticky lg:top-24"
    >
      <h2
        id="atlas-reader-spoilers"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('readers.spoilers.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('readers.spoilers.body')}</p>
      <p className="m-0 text-sm text-body">{t('readers.introItems')}</p>
      <Link
        to={`/plan/s/${slug}/preview`}
        className="inline-flex h-11 items-center self-start rounded-full button-main px-6 font-semibold no-underline"
      >
        {t('readers.previewLink')}
      </Link>
    </aside>
  );
}

/** The page's text, switches, characters and aside, once the settings have loaded. */
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
        <p className="m-0 max-w-[70ch] text-body">{t('readers.intro')}</p>
      </header>
      {preview && !preview.isPublished && <Notice tone="info">{t('readers.notPublished')}</Notice>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          <PublicAreaSwitches savedAreas={visibility.areas} save={saveAreas} />
          <ReaderCharactersList slug={slug} visibility={visibility} />
        </div>
        <SpoilerAside slug={slug} />
      </div>
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
