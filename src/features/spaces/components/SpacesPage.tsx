/**
 * SpacesPage: every space the reader may see, latest activity first, 20 at a time, at /spaces
 * (bundle FORUMS-2, part a; S1-E8-06; the "See all" page for board 5.1's Spaces card).
 *
 * Who shows it: the router; "See all spaces" and the breadcrumb on a space's page link here.
 * Anyone can read it; the database leaves out the spaces the reader may not see (an under-16
 * space whose readers are members only, for anyone outside its age group).
 * What it calls: useSpaceList → space_list().
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRow } from './SpaceRow';

/** How many spaces a page reads. */
const pageSize = 20;

/** The heading block: the breadcrumb back to the forums, the title, the intro and the button. */
function SpacesHeader() {
  const { t } = useSpacesTranslation();
  return (
    <header className="relative flex max-w-[680px] flex-col gap-2">
      <nav aria-label={t('space.breadcrumb')}>
        <Link to="/forums" className="inline-flex min-h-6 items-center text-sm text-link underline">
          {t('space.forums')}
        </Link>
      </nav>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-none font-extrabold tracking-[-0.025em]">
        {t('title')}
      </h1>
      <p className="m-0 text-base leading-relaxed text-body">{t('intro')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Link
          to="/spaces/new"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('create')}
        </Link>
        {/* A student with a class code types it on /class (bundle CLASSES, part b). */}
        <Link
          to="/class"
          className="inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
        >
          {t('joinClassLink')}
        </Link>
      </div>
      <Doodle
        name="tote-bag-of-books"
        kind="background"
        hideBelow="wide"
        className="absolute -top-2 -right-40 w-[80px] rotate-6"
      />
    </header>
  );
}

/**
 * Renders the page.
 *
 * @returns the heading and the list
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
        <section
          aria-label={t('title')}
          className="max-w-[860px] overflow-hidden rounded-card border border-border bg-surface"
        >
          <ul className="m-0 list-none p-0">
            {list.spaces.map((space) => (
              <SpaceRow key={space.id} space={space} />
            ))}
          </ul>
          {list.hasMore && (
            <div className="flex justify-center border-t border-border p-4">
              <Button variant="secondary" onClick={list.showMore} disabled={list.isLoadingMore}>
                {t('showMore')}
              </Button>
            </div>
          )}
        </section>
      )}
    </PageContainer>
  );
}
