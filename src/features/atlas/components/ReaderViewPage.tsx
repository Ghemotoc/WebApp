/**
 * ReaderViewPage: /plan/s/:storySlug/readers, "What readers can see" in Story Atlas (story
 * S1-E17-32; redrawn by user stories bundle 6, story 6.14, board E33).
 *
 * The Story Atlas top bar and the heading, then one column, as board E33 draws it: a line on how
 * sharing works with "Preview as a reader" (the page's one main button), a plain note while the
 * story isn't published, "Areas readers see" (the five switches) and "Characters" (what readers
 * see of each). Only the writer sees it.
 * Who calls it: src/app/router.tsx. What it calls: usePlanVisibility, usePlanPreview (whether
 * the story is published), PublicAreaSwitches, ReaderCharactersList and AtlasFrame.
 */
import { Link, useParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { usePlanPreview } from '../hooks/usePlanPreview';
import { usePlanVisibility } from '../hooks/usePlanVisibility';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFrame } from './AtlasFrame';
import { PublicAreaSwitches } from './PublicAreaSwitches';
import { ReaderCharactersList } from './ReaderCharactersList';

/** How sharing works, with "Preview as a reader" under it (board E33). */
function ReaderIntro({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 type-body text-ink">{t('readers.intro')}</p>
      <Link
        to={`/plan/s/${slug}/preview`}
        className="inline-flex h-11 items-center gap-2 self-start rounded-full button-main px-6 font-semibold no-underline"
      >
        <ActionIcon name="eye" size={18} />
        {t('readers.previewLink')}
      </Link>
    </div>
  );
}

/** The page's heading, line, switches and characters, once the settings have loaded. */
function ReaderViewBody({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { visibility, saveAreas } = usePlanVisibility(slug);
  const { preview } = usePlanPreview(slug);
  if (!visibility) return null;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <h1 className="m-0 type-title lg:type-display break-words">{t('readers.heading')}</h1>
      <ReaderIntro slug={slug} />
      {preview && !preview.isPublished && <Notice tone="info">{t('readers.notPublished')}</Notice>}
      <PublicAreaSwitches savedAreas={visibility.areas} save={saveAreas} />
      <ReaderCharactersList slug={slug} visibility={visibility} />
    </div>
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
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="readers"
      showsChrome={userId !== null}
    >
      <title>{t('readers.documentTitle', { title: storyTitle })}</title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {visibility === null && <Notice tone="error">{t('notFound')}</Notice>}
      {visibility && <ReaderViewBody slug={storySlug} />}
    </AtlasFrame>
  );
}
