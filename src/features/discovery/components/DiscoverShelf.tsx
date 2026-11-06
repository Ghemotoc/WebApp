/**
 * DiscoverShelf: one shelf on Discover, filled from one story list (story S1-E5-01; board 3.1).
 *
 * The shelf is the shared Shelf: one scrolling line of at most 20, then a "View more" card to the
 * list's See all page (S1-E5-09; CLAUDE.md rule 20), a fade at each edge with cards hidden
 * past it and scroll arrows.
 * An empty list draws nothing, so Discover never shows an empty row; while it loads, nothing
 * either, so the page doesn't jump.
 * Who uses it: DiscoverPage. What it calls: useStoryShelf → browse_stories().
 */
import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';

import type { ListRequest } from '../api/storyLists';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { listAddress } from '../lib/listAddresses';

import { ListedStoryCard } from './ListedStoryCard';

/** What a shelf needs. */
export interface DiscoverShelfProps {
  title: string;
  eyebrow: string;
  request: ListRequest;
}

/**
 * Renders the shelf, or nothing while it loads or when the list is empty.
 *
 * @returns the shelf section or null
 */
export function DiscoverShelf({ title, eyebrow, request }: DiscoverShelfProps) {
  const { shelf } = useStoryShelf(request);
  if (shelf === null || shelf.stories.length === 0) return null;
  const covers = designsForRow(shelf.stories);
  return (
    <Shelf
      eyebrow={eyebrow}
      title={title}
      seeAllHref={listAddress(request)}
      totalCount={shelf.total}
      items={shelf.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
        ),
      }))}
    />
  );
}
