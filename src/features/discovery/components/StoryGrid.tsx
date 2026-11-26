/**
 * StoryGrid: every story of a list as a grid of cards, with "Show 20 more" (story S1-E5-09; board
 * 3.10; user story 1.5, board A05).
 *
 * A See all page is the one place stories sit in rows of cards instead of one scrolling line:
 * it is where a shelf's "View more" leads (CLAUDE.md rule 20). Five covers across from 1024 px,
 * four from 600 px and two on phones, 24 px apart (16 px on phones) and 32 px between rows, as
 * user story 1.5 and board A05 say. "Show 20 more" adds the next 20 below and puts
 * nothing in the reader's way while they load; the new count is announced politely.
 * A long grid carries the list's ad among the stories as a banner across a whole row: after every
 * two rows, never closer than 10 stories, so each "Show 20 more" brings more in; a short list has
 * its one ad at its end (bundle G7e; Robert, 20 Nov 2026: "a banner every two rows"; boards A05,
 * A06 and A09; lib/gridAdPlaces.ts). useGridColumns says how many cards a row holds, so a banner
 * always sits between two full rows. A place whose ad doesn't come (a visitor, no ad today)
 * takes no room at all.
 * Who uses it: StoryListPage.
 */
import type { ReactNode } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';

import type { ListedStory } from '../api/storyLists';
import { useGridColumns } from '../hooks/useGridColumns';
import { storiesPerPage } from '../hooks/useStoryList';
import { isAdAfterStory, storiesBetweenBanners, type GridAdPlaces } from '../lib/gridAdPlaces';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ListedStoryCard } from './ListedStoryCard';

/** The list's ad, and where it goes among the stories. */
export interface StoryGridAd {
  /** The ad slot, drawn again at each place (it draws nothing when there is no ad). */
  slot: ReactNode;
  /** True to put a short list's one ad after its last story (lib/gridAdPlaces.ts). */
  isShortListAdded: boolean;
}

/** What the grid needs. */
export interface StoryGridProps {
  stories: ListedStory[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** The list's ad among the stories, or nothing for a list without one. */
  ad?: StoryGridAd;
}

/**
 * An ad's place: a whole row, so the banner sits between two rows of cards. `empty:hidden`: when
 * the slot draws nothing, its place takes no row and leaves no gap.
 */
const adPlaceClasses = 'col-span-full w-full min-w-0 empty:hidden';

/**
 * Where the banners go in a grid with this many cards a row: the first after two full rows
 * (still high on the page), then the same distance again.
 *
 * @param cardsPerRow - the grid's columns right now
 * @param isShortListAdded - the list's short-list rule
 * @returns the places for lib/gridAdPlaces.ts
 */
function bannerPlaces(cardsPerRow: number, isShortListAdded: boolean): GridAdPlaces {
  const storiesBetween = storiesBetweenBanners(cardsPerRow);
  return { firstAfter: storiesBetween, storiesBetween, isShortListAdded };
}

/**
 * Renders the grid and the button.
 *
 * @returns the list of cards
 */
export function StoryGrid({ stories, hasMore, isLoadingMore, onLoadMore, ad }: StoryGridProps) {
  const { t } = useDiscoveryTranslation();
  const covers = designsForRow(stories);
  // Step 1: the banners' places follow the cards a row holds at this width.
  const cardsPerRow = useGridColumns();
  const places = ad === undefined ? null : bannerPlaces(cardsPerRow, ad.isShortListAdded);
  // Step 2: the cards, each followed by the banner where one belongs.
  return (
    <div className="flex flex-col items-center gap-8">
      <ul className="m-0 grid w-full list-none grid-cols-2 gap-x-4 gap-y-8 p-0 min-[600px]:grid-cols-4 min-[600px]:gap-x-6 min-[1024px]:grid-cols-5">
        {stories.map((story, index) => {
          const storyNumber = index + 1;
          const hasAdAfter = places !== null && isAdAfterStory(storyNumber, stories.length, places);
          return [
            <li key={story.slug} className="w-full min-w-0">
              <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
            </li>,
            hasAdAfter && (
              <li key={`ad-after-${storyNumber}`} className={adPlaceClasses}>
                {ad?.slot}
              </li>
            ),
          ];
        })}
      </ul>
      {hasMore && (
        <Button variant="secondary" disabled={isLoadingMore} onClick={onLoadMore}>
          {isLoadingMore
            ? t('seeAll.loadingMore')
            : t('seeAll.loadMore', { count: storiesPerPage })}
        </Button>
      )}
    </div>
  );
}
