/**
 * StoryGrid: every story of a list as a grid of cards, with "Load more" (story S1-E5-09; board
 * 3.10).
 *
 * A See all page is the one place stories sit in rows of cards instead of one scrolling line:
 * it is where a shelf's "View more" leads (CLAUDE.md rule 20). Columns fill the width at 210 to
 * 248 px a card, so it is two on a phone and five on a wide screen, as the DiscoverAll board draws
 * it (bundle G7c). "Load more" adds the next 24 and puts
 * nothing in the reader's way while they load; the new count is announced politely.
 * A long grid carries the list's ad among the stories: the first one high up, then one after
 * every 10 stories, so each "Load more" brings more in; a short list has its one ad at its end
 * (bundle G7e; lib/gridAdPlaces.ts). A card-sized ad takes one cell; a wide banner takes a whole
 * row. A place whose ad doesn't come (a visitor, no ad today) takes no room at all.
 * Who uses it: StoryListPage.
 */
import type { ReactNode } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';

import type { ListedStory } from '../api/storyLists';
import { isAdAfterStory } from '../lib/gridAdPlaces';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ListedStoryCard } from './ListedStoryCard';

/** The list's ad, and where it goes among the stories. */
export interface StoryGridAd {
  /** The ad slot, drawn again at each place (it draws nothing when there is no ad). */
  slot: ReactNode;
  /** The story the first ad follows, counting from 1; then one after every 10 more. */
  firstAfter: number;
  /** True for a wide banner, which takes a whole row; false for a card-sized ad. */
  spansRow: boolean;
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

/** The classes of an ad's place: a whole row for a banner, one cell for a card. */
function adPlaceClasses(spansRow: boolean): string {
  // `empty:hidden`: when the slot draws nothing, its place takes no cell and leaves no gap.
  return spansRow ? 'col-span-full w-full empty:hidden' : 'w-full max-w-[248px] empty:hidden';
}

/**
 * Renders the grid and the button.
 *
 * @returns the list of cards
 */
export function StoryGrid({ stories, hasMore, isLoadingMore, onLoadMore, ad }: StoryGridProps) {
  const { t } = useDiscoveryTranslation();
  const covers = designsForRow(stories);
  return (
    <div className="flex flex-col items-center gap-8">
      <ul className="m-0 grid w-full list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-center gap-x-5 gap-y-8 p-0 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
        {stories.map((story, index) => {
          const storyNumber = index + 1;
          const hasAdAfter =
            ad !== undefined &&
            isAdAfterStory(storyNumber, stories.length, ad.firstAfter, ad.isShortListAdded);
          return [
            <li key={story.slug} className="w-full max-w-[248px] min-w-0">
              <ListedStoryCard
                story={story}
                cover={covers[index] ?? resolveCoverChoice(story)}
                isFluid
              />
            </li>,
            hasAdAfter && (
              <li key={`ad-after-${storyNumber}`} className={adPlaceClasses(ad.spansRow)}>
                {ad.slot}
              </li>
            ),
          ];
        })}
      </ul>
      {hasMore && (
        <Button variant="secondary" disabled={isLoadingMore} onClick={onLoadMore}>
          {isLoadingMore ? t('seeAll.loadingMore') : t('seeAll.loadMore')}
        </Button>
      )}
    </div>
  );
}
