/**
 * SpacesPage: the spaces a member can see, at /spaces (bundle FORUMS-2, part a; S1-E8-06; redrawn
 * as board F06 in bundle BOOKS-7, user story 7.6).
 *
 * As the board draws it: the breadcrumb "Together / Spaces", the title, the lead line and
 * "Create a space" (the plum main button) under it; then "Joined", the spaces the member is in
 * (class spaces included, only for their members), then "More spaces" with its order drop-down,
 * Join or Ask to join on each row and "Show 20 more"; then one advert banner after the lists
 * (slot spaces_wide; never on a class space, which this page isn't). A student with a class code
 * finds "Join a class" beside "Create a space" (bundle CLASSES, part b).
 * Who shows it: the router; "See all spaces" on Together and a space's breadcrumb link here.
 * Anyone can read it; the database leaves out the spaces the reader may not see.
 * What it calls: SpacesJoinedSection and SpacesMoreSection (space_list()), PageAdSlot.
 */
import { Link } from 'react-router';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpacesJoinedSection } from './SpacesJoinedSection';
import { SpacesMoreSection } from './SpacesMoreSection';

/**
 * The breadcrumb, the title, the lead line and the two ways in.
 *
 * @returns the page's header
 */
function SpacesHeader() {
  const { t } = useSpacesTranslation();
  const steps = [{ label: t('space.forums'), to: '/forums' }, { label: t('title') }];
  return (
    <header className="flex flex-col gap-6">
      <Breadcrumb label={t('space.breadcrumb')} steps={steps} />
      <div className="flex flex-col gap-2">
        <h1 className="page-title m-0">{t('title')}</h1>
        <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('intro')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/spaces/new"
          className="inline-flex h-11 items-center rounded-full button-main px-6 type-label font-semibold no-underline"
        >
          {t('create')}
        </Link>
        {/* A student with a class code types it on /class (bundle CLASSES, part b). */}
        <Link
          to="/class"
          className="hit-target inline-flex min-h-6 items-center type-body text-link underline"
        >
          {t('joinClassLink')}
        </Link>
      </div>
    </header>
  );
}

/**
 * Renders the page.
 *
 * @returns the header, the two lists and the advert
 */
export function SpacesPage() {
  return (
    <PageContainer className="flex flex-col gap-16 pt-12 pb-20">
      <SpacesHeader />
      <SpacesJoinedSection />
      <SpacesMoreSection />
      {/* One banner after the lists (user story 7.6), 728 × 90, centred as the board draws it. */}
      <PageAdSlot pageKey="spaces" position={1} className="flex justify-center" />
    </PageContainer>
  );
}
