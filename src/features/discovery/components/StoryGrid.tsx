/**
 * StoryGrid: every story of a list as a grid of cards, with "Load more" (story S1-E5-09; board
 * 3.10).
 *
 * A See all page is the one place stories sit in rows of cards instead of one scrolling line:
 * it is where a shelf's "View more" leads (CLAUDE.md rule 20). Columns fill the width at 210 to
 * 248 px a card, so it is two on a phone and five on a wide screen, as the DiscoverAll board draws
 * it (bundle G7c). "Load more" adds the next 24 and puts
 * nothing in the reader's way while they load; the new count is announced politely.
 * Who uses it: StoryListPage.
 */
import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';

import type { ListedStory } from '../api/storyLists';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ListedStoryCard } from './ListedStoryCard';

/** What the grid needs. */
export interface StoryGridProps {
  stories: ListedStory[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * Renders the grid and the button.
 *
 * @returns the list of cards
 */
export function StoryGrid({ stories, hasMore, isLoadingMore, onLoadMore }: StoryGridProps) {
  const { t } = useDiscoveryTranslation();
  const covers = designsForRow(stories);
  return (
    <div className="flex flex-col items-center gap-8">
      <ul className="m-0 grid w-full list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-center gap-x-5 gap-y-8 p-0 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
        {stories.map((story, index) => (
          <li key={story.slug} className="w-full max-w-[248px]">
            <ListedStoryCard
              story={story}
              cover={covers[index] ?? resolveCoverChoice(story)}
              isFluid
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="secondary" disabled={isLoadingMore} onClick={onLoadMore}>
          {isLoadingMore ? t('seeAll.loadingMore') : t('seeAll.loadMore')}
        </Button>
      )}
    </div>
  );
}
