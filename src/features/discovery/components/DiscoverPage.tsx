/**
 * DiscoverPage: Discover, screen 3.1 (story S1-E5-01; design/boards/Discover.dc.html).
 *
 * Who shows it: the router, at /discover; the top bar's "Discover" link.
 * What it shows: the eyebrow and heading, "Browse by category", then the shelves: New from
 * writers you follow (signed in), Recently updated, New stories, Completed and one per category.
 * Every shelf is one line of at most 20 with "View more" (CLAUDE.md rule 20), and the database
 * leaves out what this reader may not see: ratings above their age (rule 18), writers either side
 * blocks, drafts and moderated stories. Nothing is chosen from what the reader has read (no
 * personalised feed in Stage 1; S1-E5-09's legal note).
 * The board's featured story, greeting, continue reading, draft card, ad slot, "Popular in your
 * area" and "Writers to follow" come with their own stories (S1-E5-03, S1-E4-03, S1-E12-01) or
 * after March, so they aren't drawn. Search (S1-E5-04) is after March.
 * What it calls: DiscoverShelf (useStoryShelf → browse_stories()) and CategoryLinks.
 */
import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import { useStoryShelf } from '../hooks/useStoryShelf';
import { plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { CategoryLinks } from './CategoryLinks';
import { DiscoverShelf } from './DiscoverShelf';

/** The shelves every reader gets, in order (the lists from browse_stories()). */
const everyoneShelves = ['updated', 'new', 'completed'] as const;

/**
 * The heading block: eyebrow, heading and the line under it.
 *
 * @returns the header
 */
function DiscoverHeader() {
  const { t } = useDiscoveryTranslation();
  return (
    <header className="flex flex-col gap-3">
      <Eyebrow>{t('discover.eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[clamp(36px,6vw,64px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-heading">
        {t('discover.heading')}
      </h1>
      <p className="m-0 max-w-[620px] text-base leading-relaxed text-body">
        {t('discover.intro', { productName: brand.productName })}
      </p>
    </header>
  );
}

/**
 * The shelves, once the first one says there is something to show.
 *
 * @returns the shelves, the empty state or the error
 */
function DiscoverShelves() {
  const { t } = useDiscoveryTranslation();
  const { userId } = useSession();
  const { categories } = useStoryFormOptions();
  // Recently updated holds every story a reader may see, so it tells whether there is anything.
  const { shelf, loadFailed } = useStoryShelf(plainList('updated'));
  if (loadFailed) return <Notice tone="error">{t('discover.loadFailed')}</Notice>;
  if (shelf === null) return null;
  if (shelf.total === 0) {
    return (
      <EmptyState
        title={t('seeAll.empty')}
        description={t('discover.empty')}
        action={<Link to="/write/new">{t('discover.writeLink')}</Link>}
      />
    );
  }
  return (
    <div className="flex flex-col gap-14">
      {userId !== null && (
        <DiscoverShelf
          eyebrow={t('lists.followingEyebrow')}
          title={t('lists.following')}
          request={plainList('following')}
        />
      )}
      {everyoneShelves.map((kind) => (
        <DiscoverShelf
          key={kind}
          eyebrow={t(`lists.${kind}Eyebrow`)}
          title={t(`lists.${kind}`)}
          request={plainList(kind)}
        />
      ))}
      {categories.map((category) => (
        <DiscoverShelf
          key={category.slug}
          eyebrow={t('lists.categoryEyebrow')}
          title={t(`categories.${category.slug}`, { ns: 'writing' })}
          request={plainList('category', category.slug)}
        />
      ))}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns Discover
 */
export function DiscoverPage() {
  const { t } = useDiscoveryTranslation();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-10 pt-10 pb-14">
      <title>{t('discover.documentTitle', { productName: brand.productName })}</title>
      <DiscoverHeader />
      <CategoryLinks />
      <DiscoverShelves />
    </PageContainer>
  );
}
