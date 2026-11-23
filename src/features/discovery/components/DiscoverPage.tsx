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
 * - for a member, the side column "For Lia" (ReadSideColumn): Continue reading, the latest draft,
 *   "Start a new story" and New and rising writers. From 1024 px it sits beside the hero and the
 *   rows; narrower, it comes after the rows (board). For a member the writers move from the rows
 *   into the side column, so they show once.
 * Every row is one line of at most 20 with "View" (CLAUDE.md rule 20), and the database leaves out
 * what this reader may not see: ratings above their age (rule 18), writers either side of a block,
 * drafts and moderated stories. Nothing is chosen from what the reader has read (no personalised
 * feed in Stage 1; S1-E5-09's legal note); the side column shows only the member's own places and
 * drafts. Popular ranks by totals only (reads, likes, comments; never downvotes), the same for
 * everyone. The wide ad slot sits after the first row (S1-E12-01; board), then, for a member with
 * "Suggestions from reading" on, "Because you read" (BecauseYouReadShelf, S1-E15-06).
 * What it calls: ReadHeader, FeaturedBand, ReadSideColumn, DiscoverShelf (useStoryShelf →
 * browse_stories()), PopularShelf and RisingWritersShelf.
 */
import { Fragment } from 'react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { BecauseYouReadShelf } from '@/features/suggestions/components/BecauseYouReadShelf';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import { everyLanguage, type ListKind } from '../api/storyLists';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { discoverListKinds, plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { DiscoverShelf } from './DiscoverShelf';
import { FeaturedBand } from './FeaturedBand';
import { PopularShelf } from './PopularShelf';
import { ReadHeader } from './ReadHeader';
import { ReadSideColumn } from './ReadSideColumn';
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
 * visitor (a member has them in the side column); an unknown word never. Used so the ad slot follows the first shelf the reader can actually get, not an
 * empty place (a visitor's ad sat straight under the heading before).
 *
 * @param word - from discover_shelves
 * @param isSignedIn - whether someone is signed in
 * @returns true when the word may draw a shelf
 */
function shelfCanShow(word: string, isSignedIn: boolean): boolean {
  if (word === 'categories') return true;
  // CALM-7c: a member meets these writers in the side column, so the row is for visitors only.
  if (word === 'writers') return !isSignedIn;
  const kind = shelfKindFrom(word);
  if (kind === null) return false;
  return isSignedIn || (kind !== 'following' && kind !== 'picked');
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
 * The shelves, once the first one says there is something to show.
 *
 * @returns the shelves, the empty state or the error
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
  // The order staff set (discover_shelves); a word listed twice shows once, and a word that
  // can't draw anything for this reader is left out.
  const isSignedIn = userId !== null;
  const words = [...new Set(wordsOf('discover_shelves', defaultShelfOrder))].filter((word) =>
    shelfCanShow(word, isSignedIn),
  );
  return (
    <div className="flex flex-col gap-12">
      {words.map((word, index) => (
        <Fragment key={word}>
          <ShelfFromSetting word={word} isSignedIn={isSignedIn} />
          {/* The wide ad slot comes after the first shelf, so the reader meets stories first. */}
          {index === 0 && <FirstShelfAd word={word} />}
          {/* "Because you read" (S1-E15-06): a member's own row, after the first shelf. */}
          {index === 0 && <BecauseYouReadShelf />}
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
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-16">
      <title>{t('discover.documentTitle', { productName: brand.productName })}</title>
      <ReadHeader />
      {/* No search field of its own (bundle G4 SHELL: the top bar and the tab bar open Search)
          and no genre chips (Robert, 20 Nov 2026: Read has no genre chip bar). */}
      {/* From 1024 px the side column starts level with the hero and spans the rows too; the 1fr
          second row takes its extra height, so the rows follow the hero straight away. It comes
          last in the page's order, so narrower it sits under the rows (board). Without a side
          column the main column takes the whole width. */}
      <div className="grid grid-cols-1 items-start gap-8 lg:has-[>[data-discover-side]]:grid-cols-[minmax(0,1fr)_300px] lg:has-[>[data-discover-side]]:grid-rows-[auto_1fr]">
        {/* Featured this week, picked by staff (S1-E5-10); not drawn when nothing is picked. */}
        <FeaturedBand />
        <div className="min-w-0 lg:col-start-1">
          <DiscoverShelves />
        </div>
        {/* For a member: Continue reading, the draft, Start a new story and the writers. */}
        {userId !== null && <ReadSideColumn />}
      </div>
    </PageContainer>
  );
}
