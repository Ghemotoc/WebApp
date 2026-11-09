/**
 * SpacesPage: every space the reader may see, latest activity first, 20 at a time, at /spaces
 * (bundle FORUMS-2, part a, redrawn in G8b; S1-E8-06; board Spaces in the liquid glass redesign).
 *
 * As the board draws it: the breadcrumb back to the forums, the header ("Run by members", the
 * page title, the lead line, and "Create a space" on the right), then the spaces as glass cards,
 * three across on a wide screen, two on a tablet and one on a phone, and "Show 20 more". The board's
 * ad slot under the header isn't drawn: the ad catalogue has no slot for this page yet (noted in
 * the pull request's follow-ups). A student with a class code finds "Join a class" beside
 * "Create a space" (bundle CLASSES, part b).
 * Who shows it: the router; "See all spaces" and the breadcrumb on a space's page link here.
 * Anyone can read it; the database leaves out the spaces the reader may not see (an under-16
 * space whose readers are members only, for anyone outside its age group).
 * What it calls: useSpaceList → space_list(); SpaceCard for each space.
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceCard } from './SpaceCard';

/** How many spaces each "Show more" adds. */
const pageSize = 20;

/**
 * The breadcrumb, the title and the two ways in.
 *
 * @returns the page's header
 */
function SpacesHeader() {
  const { t } = useSpacesTranslation();
  return (
    <header className="flex flex-col gap-4">
      <nav aria-label={t('space.breadcrumb')}>
        <Link to="/forums" className="inline-flex min-h-6 items-center text-sm text-link underline">
          {t('space.forums')}
        </Link>
      </nav>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-[760px] flex-col gap-2">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h1 className="page-title">{t('title')}</h1>
          <p className="m-0 text-lg leading-relaxed text-body">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* A student with a class code types it on /class (bundle CLASSES, part b). */}
          <Link
            to="/class"
            className="inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
          >
            {t('joinClassLink')}
          </Link>
          <Link
            to="/spaces/new"
            className="inline-flex h-12 items-center rounded-full button-main px-6 text-[15px] font-semibold no-underline"
          >
            {t('create')}
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Renders the page.
 *
 * @returns the header and the spaces, or why there are none
 */
export function SpacesPage() {
  const { t } = useSpacesTranslation();
  const list = useSpaceList(pageSize);
  return (
    <PageContainer className="flex flex-col gap-8 py-10">
      <SpacesHeader />
      {list.loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {list.spaces !== null && list.spaces.length === 0 && (
        <p className="m-0 text-base text-body">{t('empty')}</p>
      )}
      {list.spaces !== null && list.spaces.length > 0 && (
        <section aria-label={t('title')} className="flex flex-col gap-6">
          <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
            {list.spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </ul>
          {list.hasMore && (
            <Button
              variant="secondary"
              className="self-center"
              onClick={list.showMore}
              disabled={list.isLoadingMore}
            >
              {t('showMore')}
            </Button>
          )}
        </section>
      )}
    </PageContainer>
  );
}
