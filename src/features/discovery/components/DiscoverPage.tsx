/**
 * DiscoverPage: Read, screen 3.1 at /discover (stories S1-E5-01 and S1-E5-12; since CALM-7c the
 * simplified board New-Read, page template "shelf page").
 *
 * Who shows it: the router, at /discover; the top bar's and the tab bar's "Read".
 * What it shows, top to bottom:
 * - ReadHeader: the title "Read", the meta line (the date and, for someone signed in, the
 *   greeting and how many stories by writers they follow were updated this week) and the line
 *   with "How ranking works" (the terms' ranking section, DSA art. 27; S1-E5-03);
 * - Featured this week (S1-E5-10) as the page's one glass hero, when staff picked stories this
 *   reader may see;
 * - the rows in the order of the public setting discover_shelves (S1-E5-03, Q46: changed
 *   without a release). Since LOOK-4b (Robert, 6 Nov 2026, D5) it holds the board's five: New from
 *   writers you follow (signed in), Popular, New and rising, Public-domain classics and Writers to
 *   follow this week (S1-E5-11). The other words (picked, shared, new, completed, updated,
 *   categories) still work if staff put them back. Rows have a plain heading, no eyebrow (CALM-7c);
 * - for a member (user story 1.4, board A04): the writers' box beside the featured story
 *   (ReadWritersBox, New and rising writers), then the row of cards "For Lia" (ReadSideColumn:
 *   Continue reading, the latest draft and "Start a new story"), then the rows the full width.
 *   For a member the writers move from the rows into the box, so they show once.
 * Every row is one line of at most 20 with "View" (CLAUDE.md rule 20), and the database leaves out
 * what this reader may not see: ratings above their age (rule 18), writers either side of a block,
 * drafts and moderated stories. Nothing is chosen from what the reader has read (no personalised
 * feed in Stage 1; S1-E5-09's legal note); the cards show only the member's own places and
 * drafts. Popular ranks by totals only (reads, likes, comments; never downvotes), the same for
 * everyone. The wide ad slot sits after the first row (S1-E12-01; board), then, for a member with
 * "Suggestions from reading" on, "Because you read" (BecauseYouReadShelf, S1-E15-06). A second
 * wide banner sits lower down between two rows: between the first two genre rows, or after the
 * third row (board A04; lib/secondAdPlace.ts). Staff book and switch both in Sponsors › Placements.
 * What it calls: ReadHeader, FeaturedBand, ReadWritersBox, ReadSideColumn, DiscoverShelf (useStoryShelf →
 * browse_stories()), PopularShelf and RisingWritersShelf.
 */
import { Fragment } from 'react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PlaceholderShelf } from '@/components/ui/PlaceholderShelf';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { BecauseYouReadShelf } from '@/features/suggestions/components/BecauseYouReadShelf';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import { everyLanguage, type ListKind } from '../api/storyLists';
import { useFeaturedStories } from '../hooks/useFeaturedStories';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { discoverListKinds, plainList } from '../lib/listAddresses';
import { secondAdPlace } from '../lib/secondAdPlace';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { DiscoverShelf } from './DiscoverShelf';
import { FeaturedBand } from './FeaturedBand';
import { PopularShelf } from './PopularShelf';
import { ReadHeader } from './ReadHeader';
import { ReadSideColumn } from './ReadSideColumn';
import { ReadWritersBox } from './ReadWritersBox';
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

/**
 * Whether a word of the setting can draw anything for this reader: "categories" and known lists
 * can; the follows shelf and "Picked for you" only for someone signed in; "writers" only for a
 * visitor (a member has them in the writers' box); an unknown word never. Used so the ad slot follows the first shelf the reader can actually get, not an
 * empty place (a visitor's ad sat straight under the heading before).
 *
 * @param word - from discover_shelves
 * @param isSignedIn - whether someone is signed in
 * @returns true when the word may draw a shelf
 */
function shelfCanShow(word: string, isSignedIn: boolean): boolean {
  if (word === 'categories') return true;
  // CALM-7c: a member meets these writers in the writers' box beside the featured story, so the row is for visitors only.
  if (word === 'writers') return !isSignedIn;
  const kind = shelfKindFrom(word);
  if (kind === null) return false;
  return isSignedIn || (kind !== 'following' && kind !== 'picked');
}

/**
 * One shelf per category, in the categories table's order; with hasAdBetween, the page's second
 * banner sits between the first two (board A04: between Mystery and Poetry).
 *
 * @param props.hasAdBetween - whether the second banner goes after the first genre row
 * @returns the genre rows
 */
function GenreShelves({ hasAdBetween }: { hasAdBetween: boolean }) {
  const { t } = useDiscoveryTranslation();
  const { categories } = useStoryFormOptions();
  return categories.map((category, index) => (
    <Fragment key={category.slug}>
      <DiscoverShelf
        title={t(`categories.${category.slug}`, { ns: 'writing' })}
        request={plainList('category', category.slug)}
      />
      {hasAdBetween && index === 0 && categories.length > 1 && (
        <GenreRowAd categorySlug={category.slug} />
      )}
    </Fragment>
  ));
}

/**
 * The second banner after the first genre row, drawn only once that row has stories.
 *
 * @param props.categorySlug - the first genre
 * @returns the slot, or nothing while the row loads or when it is empty
 */
function GenreRowAd({ categorySlug }: { categorySlug: string }) {
  const { shelf } = useStoryShelf(plainList('category', categorySlug));
  if (shelf === null || shelf.stories.length === 0) return null;
  return <PageAdSlot pageKey="discover" position={2} />;
}

/**
 * One shelf of the setting: a list, or one shelf per category.
 *
 * @param props.word - one word of discover_shelves
 * @param props.isSignedIn - the follows shelf is only for someone signed in
 * @param props.hasAdBetweenGenres - whether the second banner goes between the genre rows
 * @returns the shelf or shelves, or nothing
 */
function ShelfFromSetting({
  word,
  isSignedIn,
  hasAdBetweenGenres = false,
}: {
  word: string;
  isSignedIn: boolean;
  hasAdBetweenGenres?: boolean;
}) {
  const { t } = useDiscoveryTranslation();
  // Step 1: "categories" is one shelf per category.
  if (word === 'categories') return <GenreShelves hasAdBetween={hasAdBetweenGenres} />;
  // Step 2: "writers" is Writers to follow this week (S1-E5-11), a shelf of people, not stories.
  if (word === 'writers') return <RisingWritersShelf />;
  // Step 3: any other word is a list; an unknown word (a typo in the setting) shows nothing.
  const kind = shelfKindFrom(word);
  if (kind === null) return null;
  // The follows shelf and "Picked for you" (S1-E2-06) belong to someone signed in.
  if ((kind === 'following' || kind === 'picked') && !isSignedIn) return null;
  // MARKETS-2d: Popular carries its "Popular in" drop-down.
  if (kind === 'popular') return <PopularShelf />;
  return (
    <DiscoverShelf
      title={t(`lists.${kind}`)}
      request={plainList(kind)}
      isFollowingRow={kind === 'following'}
    />
  );
}

/**
 * The wide ad slot after the first shelf (S1-E12-01), drawn only once that shelf has loaded, so
 * the ad never sits just under the heading for a moment and then jumps down (or gets counted as
 * seen before the reader has met any stories). It reads the same cached list as the shelf, so it
 * asks the server for nothing more. Discover is about every category, so it sends no context.
 *
 * @param props.word - the first word of discover_shelves this reader can get
 * @returns the slot, or nothing while the first shelf loads
 */
function FirstShelfAd({ word }: { word: string }) {
  // "categories" and "writers" aren't story lists; Recently updated has loaded by now for them.
  const { shelf } = useStoryShelf(plainList(shelfKindFrom(word) ?? 'updated'));
  if (shelf === null) return null;
  return <PageAdSlot pageKey="discover" position={1} />;
}

/**
 * The second wide banner, after a row lower down (board A04; lib/secondAdPlace.ts), drawn only
 * once that row has stories, so the two banners never end up next to each other above empty rows.
 * It reads the same cached list as the row (Popular without its country), so it asks for nothing
 * new.
 *
 * @param props.word - the word of discover_shelves the banner follows
 * @returns the slot, or nothing while the row loads or when it is empty
 */
function LowerRowAd({ word }: { word: string }) {
  const { shelf } = useStoryShelf(plainList(shelfKindFrom(word) ?? 'updated'));
  if (shelf === null || shelf.stories.length === 0) return null;
  return <PageAdSlot pageKey="discover" position={2} />;
}

/**
 * The shelves, once the first one says there is something to show; grey cover shapes before.
 *
 * @returns the shelves, the waiting rows, the empty state or the error
 */
function DiscoverShelves() {
  const { t } = useDiscoveryTranslation();
  const { userId } = useSession();
  const { wordsOf } = usePublicSettings();
  // Recently updated in every language holds every story a reader may see, so it tells whether
  // there is anything at all; the shelves below then follow the reader's languages (MARKETS-2c).
  const { shelf, loadFailed } = useStoryShelf({
    ...plainList('updated'),
    languageCode: everyLanguage,
  });
  if (loadFailed) return <Notice tone="error">{t('discover.loadFailed')}</Notice>;
  // While the first read runs, two rows of grey cover shapes after 300 ms (design books item 15).
  if (shelf === null) {
    return (
      <div className="flex flex-col gap-12">
        <PlaceholderShelf />
        <PlaceholderShelf />
      </div>
    );
  }
  if (shelf.total === 0) {
    return (
      <EmptyState
        title={t('seeAll.empty')}
        description={t('discover.empty')}
        action={<Link to="/write/new">{t('discover.writeLink')}</Link>}
      />
    );
  }
  // The order staff set (discover_shelves); a word listed twice shows once, and a word that
  // can't draw anything for this reader is left out.
  const isSignedIn = userId !== null;
  const words = [...new Set(wordsOf('discover_shelves', defaultShelfOrder))].filter((word) =>
    shelfCanShow(word, isSignedIn),
  );
  return <ShelfRows words={words} isSignedIn={isSignedIn} />;
}

/**
 * The rows in order, with the page's two wide banners among them.
 *
 * @param props.words - the words of discover_shelves this reader can get, in order
 * @param props.isSignedIn - whether someone is signed in
 * @returns the rows
 */
function ShelfRows({ words, isSignedIn }: { words: string[]; isSignedIn: boolean }) {
  // Board A04: the second banner sits lower down, between two rows (lib/secondAdPlace.ts).
  const secondAd = secondAdPlace(words);
  return (
    <div className="flex flex-col gap-12">
      {words.map((word, index) => (
        <Fragment key={word}>
          <ShelfFromSetting
            word={word}
            isSignedIn={isSignedIn}
            hasAdBetweenGenres={secondAd.kind === 'betweenGenres'}
          />
          {/* The wide ad slot comes after the first shelf, so the reader meets stories first. */}
          {index === 0 && <FirstShelfAd word={word} />}
          {/* "Because you read" (S1-E15-06): a member's own row, after the first shelf. */}
          {index === 0 && <BecauseYouReadShelf />}
          {secondAd.kind === 'afterRow' && secondAd.index === index && <LowerRowAd word={word} />}
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
  const { userId } = useSession();
  // The same cached list FeaturedBand reads, so asking here costs no second request.
  const hasFeatured = useFeaturedStories().stories.length > 0;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-16">
      <title>{t('discover.documentTitle', { productName: brand.productName })}</title>
      <ReadHeader />
      {/* No search field of its own (bundle G4 SHELL: the top bar and the tab bar open Search)
          and no genre chips (Robert, 20 Nov 2026: Read has no genre chip bar). */}
      {/* Board A04: the featured story with the writers' box beside it from 1024 px. Without a
          featured story the box joins the row of cards instead, so it never stretches alone. */}
      {hasFeatured && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] [&>*:only-child]:col-span-full">
          {/* Featured this week, picked by staff (S1-E5-10). */}
          <FeaturedBand />
          {userId !== null && <ReadWritersBox />}
        </div>
      )}
      {/* For a member: Continue reading, the draft and Start a new story, side by side. */}
      {userId !== null && <ReadSideColumn withWriters={!hasFeatured} />}
      <DiscoverShelves />
    </PageContainer>
  );
}
