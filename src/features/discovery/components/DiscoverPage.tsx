/**
 * DiscoverPage: Discover, screen 3.1 (stories S1-E5-01 and S1-E5-12; design/boards/Discover.dc.html).
 *
 * Who shows it: the router, at /discover; the top bar's "Discover" link.
 * What it shows, top to bottom:
 * - the heading: for a visitor "Discover" and "Find your next story"; for someone signed in the
 *   dated eyebrow and "Good morning, <name>." (GreetingHeading; S1-E2-13, S1-E5-12). The line
 *   under it links "How ranking works" (the terms'
 *   ranking section, DSA art. 27; S1-E5-03);
 * - Featured this week (S1-E5-10), when staff picked stories this reader may see, with "Your
 *   dashboard" for a member beside it from 1024 px (DiscoverCards, S1-E5-12): Continue reading,
 *   Your draft and "Start a new story", each only when it has something to show;
 * - the shelves in the order of the public setting discover_shelves (S1-E5-03, Q46: changed
 *   without a release). Since LOOK-4b (Robert, 6 Nov 2026, D5) it holds the board's five: New from
 *   writers you follow (signed in), Popular, New and rising, Public-domain classics and Writers to
 *   follow this week (S1-E5-11). The other words (picked, shared, new, completed, updated,
 *   categories) still work if staff put them back.
 * Every shelf is one line of at most 20 with "View more" (CLAUDE.md rule 20), and the database
 * leaves out what this reader may not see: ratings above their age (rule 18), writers either side
 * blocks, drafts and moderated stories. Nothing is chosen from what the reader has read (no
 * personalised feed in Stage 1; S1-E5-09's legal note); the cards show only the member's own
 * places and drafts.
 * Popular ranks by totals only (reads, likes, comments; never downvotes), the same for everyone.
 * The wide ad slot sits after the first shelf (S1-E12-01; board 3.1).
 * What it calls: FeaturedBand, GreetingHeading,
 * DiscoverCards, DiscoverShelf (useStoryShelf → browse_stories()) and RisingWritersShelf.
 * */
import { Fragment } from 'react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ListKind } from '../api/storyLists';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { discoverListKinds, plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { DiscoverCards } from './DiscoverCards';
import { DiscoverShelf } from './DiscoverShelf';
import { FeaturedBand } from './FeaturedBand';
import { GreetingHeading } from './GreetingHeading';
import { RisingWritersShelf } from './RisingWritersShelf';

/**
 * The decided shelf order, used until the setting arrives or if it can't be read (S1-E5-03;
 * the board's five since LOOK-4b, D5). "categories" would stand for one shelf per category.
 */
const defaultShelfOrder = ['following', 'popular', 'rising', 'classics', 'writers'] as const;

/**
 * Turns one word of the setting into a list, if it names one.
 *
 * @param word - from discover_shelves
 * @returns the list, or null for "categories" and unknown words
 */
function shelfKindFrom(word: string): ListKind | null {
  return discoverListKinds.find((kind) => kind === word) ?? null;
}

/** The h1's type, the same for the visitor's heading and the greeting (board 3.1). */
const headingClass =
  'm-0 min-w-0 font-heading text-[clamp(36px,4.4vw,54px)] leading-[1.02] font-bold tracking-[-0.02em] break-words text-heading';

/**
 * The visitor's eyebrow and heading, also shown while a member's name loads.
 *
 * @returns the eyebrow and the h1
 */
function VisitorHeading() {
  const { t } = useDiscoveryTranslation();
  return (
    <>
      <Eyebrow>{t('discover.eyebrow')}</Eyebrow>
      <h1 className={headingClass}>{t('discover.heading')}</h1>
    </>
  );
}

/**
 * The heading block: eyebrow, heading (a greeting for someone signed in) and the line under it.
 *
 * @returns the header
 */
function DiscoverHeader() {
  const { t } = useDiscoveryTranslation();
  const { names } = useMyNames();
  // The pen name, or the username; null for a visitor or while it loads (rule 5: no real name).
  const name = names === null ? null : displayName(names.handle, names.penName);
  return (
    <header className="flex flex-col gap-2">
      {/* No seasonal doodle beside it since bundle G4: the seasonal looks carry the season. */}
      {name === null ? (
        <VisitorHeading />
      ) : (
        <GreetingHeading name={name} className={headingClass} />
      )}
      <p className="m-0 max-w-[640px] text-[17px] leading-relaxed text-body">
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
  // Step 2: "writers" is Writers to follow this week (S1-E5-11), a shelf of people, not stories.
  if (word === 'writers') return <RisingWritersShelf />;
  // Step 3: any other word is a list; an unknown word (a typo in the setting) shows nothing.
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
      {words.map((word, index) => (
        <Fragment key={word}>
          <ShelfFromSetting word={word} isSignedIn={userId !== null} />
          {/* The wide ad slot comes after the first shelf, so the reader meets stories first
              (S1-E12-01). Discover is about every category, so it sends no context. */}
          {index === 0 && <PageAdSlot pageKey="discover" position={1} />}
        </Fragment>
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
    <PageContainer className="tmc-rise flex flex-col gap-[30px] pt-10 pb-14">
      <title>{t('discover.documentTitle', { productName: brand.productName })}</title>
      <DiscoverHeader />
      {/* No search field of its own since bundle G4 SHELL: the top bar's search pill (from
          1024 px) and the tab bar's Search button (narrower) open the Search page (S1-E5-04).
          No category chips since bundle G7: the board has no genre bar on Discover (design
          rulebook, "Discover"); the genre pages are a click away from every story card's tags
          and from Search. */}
      {/* The heading sits above both columns. From 1024 px the side column (Continue reading,
          Your draft, Start a new story) starts level with the carousel and spans the shelves'
          rows too; the 1fr second row takes its extra height, so the shelves follow the carousel
          straight away. Without a side column the main column takes the whole width. */}
      <div className="grid grid-cols-1 items-start gap-[28px] lg:has-[>[data-discover-side]]:grid-cols-[minmax(0,1fr)_300px] lg:has-[>[data-discover-side]]:grid-rows-[auto_1fr]">
        {/* Featured this week, picked by staff (S1-E5-10); not drawn when nothing is picked. */}
        <FeaturedBand />
        {/* Continue reading, Your draft and Start a new story, for a member (S1-E5-12). */}
        <DiscoverCards />
        <div className="min-w-0 lg:col-start-1">
          <DiscoverShelves />
        </div>
      </div>
    </PageContainer>
  );
}
