/**
 * DiscoverPage: Discover, screen 3.1 (story S1-E5-01; design/boards/Discover.dc.html).
 *
 * Who shows it: the router, at /discover; the top bar's "Discover" link.
 * What it shows: the eyebrow and heading with "How ranking works" (a link to the terms' ranking
 * section, DSA art. 27; S1-E5-03), "Browse by category", then the shelves in the order of the
 * public setting discover_shelves (S1-E5-03, Q46: changed without a release): New from writers
 * you follow (signed in), Popular, New and rising, Most shared this week (IDEAS-1e), New stories,
 * Completed, Recently updated and one per category.
 * Every shelf is one line of at most 20 with "View more" (CLAUDE.md rule 20), and the database
 * leaves out what this reader may not see: ratings above their age (rule 18), writers either side
 * blocks, drafts and moderated stories. Nothing is chosen from what the reader has read (no
 * personalised feed in Stage 1; S1-E5-09's legal note).
 * Popular ranks by totals only (reads, likes, comments; never downvotes), the same for everyone.
 * A signed-in reader first sees GreetingLine (S1-E2-13: good morning, or their birthday or joining
 * anniversary). The board's featured story, continue reading, draft card, ad slot, "Popular in your
 * area" and "Writers to follow" come with their own stories (S1-E4-03, S1-E12-01) or after
 * March, so they aren't drawn. Search (S1-E5-04) is after March.
 * What it calls: GreetingLine, SeasonalDoodle (S1-E5-07), SearchForm (S1-E5-04), DiscoverShelf (useStoryShelf → browse_stories()) and CategoryLinks.
 */
import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { SeasonalDoodle } from '@/features/seasonal/components/SeasonalDoodle';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ListKind } from '../api/storyLists';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { discoverListKinds, plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { SearchForm } from '@/features/search/components/SearchForm';

import { CategoryLinks } from './CategoryLinks';
import { DiscoverShelf } from './DiscoverShelf';
import { GreetingLine } from './GreetingLine';

/**
 * The decided shelf order, used until the setting arrives or if it can't be read (S1-E5-03).
 * "categories" stands for one shelf per category.
 */
const defaultShelfOrder = [
  'following',
  'picked',
  'popular',
  'rising',
  'shared',
  'new',
  'completed',
  'updated',
  'classics',
  'categories',
] as const;

/**
 * Turns one word of the setting into a list, if it names one.
 *
 * @param word - from discover_shelves
 * @returns the list, or null for "categories" and unknown words
 */
function shelfKindFrom(word: string): ListKind | null {
  return discoverListKinds.find((kind) => kind === word) ?? null;
}

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
      {/* The seasonal doodle sits beside the heading, never over it (S1-E5-07; board 3.1). */}
      <div className="flex items-center gap-[clamp(10px,1.4vw,20px)]">
        <h1 className="m-0 min-w-0 font-heading text-[clamp(36px,6vw,64px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-heading">
          {t('discover.heading')}
        </h1>
        <SeasonalDoodle
          place="discover"
          on="discover-heading"
          className="size-[clamp(56px,5.4vw,76px)] flex-none rotate-6"
        />
      </div>
      <p className="m-0 max-w-[620px] text-base leading-relaxed text-body">
        {t('discover.intro', { productName: brand.productName })}{' '}
        <Link to="/legal/terms#section-5" className="font-semibold underline underline-offset-2">
          {t('discover.howRanking')}
        </Link>
      </p>
    </header>
  );
}

/**
 * One shelf of the setting: a list, or one shelf per category.
 *
 * @param props.word - one word of discover_shelves
 * @param props.isSignedIn - the follows shelf is only for someone signed in
 * @returns the shelf or shelves, or nothing
 */
function ShelfFromSetting({ word, isSignedIn }: { word: string; isSignedIn: boolean }) {
  const { t } = useDiscoveryTranslation();
  const { categories } = useStoryFormOptions();
  // Step 1: "categories" is one shelf per category, in the categories table's order.
  if (word === 'categories') {
    return categories.map((category) => (
      <DiscoverShelf
        key={category.slug}
        eyebrow={t('lists.categoryEyebrow')}
        title={t(`categories.${category.slug}`, { ns: 'writing' })}
        request={plainList('category', category.slug)}
      />
    ));
  }
  // Step 2: any other word is a list; an unknown word (a typo in the setting) shows nothing.
  const kind = shelfKindFrom(word);
  if (kind === null) return null;
  // The follows shelf and "Picked for you" (S1-E2-06) belong to someone signed in.
  if ((kind === 'following' || kind === 'picked') && !isSignedIn) return null;
  return (
    <DiscoverShelf
      eyebrow={t(`lists.${kind}Eyebrow`)}
      title={t(`lists.${kind}`)}
      request={plainList(kind)}
    />
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
  const { wordsOf } = usePublicSettings();
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
  // The order staff set (discover_shelves); a word listed twice shows once.
  const words = [...new Set(wordsOf('discover_shelves', defaultShelfOrder))];
  return (
    <div className="flex flex-col gap-14">
      {words.map((word) => (
        <ShelfFromSetting key={word} word={word} isSignedIn={userId !== null} />
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
      <div className="flex flex-col gap-4">
        <GreetingLine />
        <DiscoverHeader />
      </div>
      {/* Search stories, writers and tags (S1-E5-04; board 3.1's search field). */}
      <SearchForm />
      <CategoryLinks />
      <DiscoverShelves />
    </PageContainer>
  );
}
