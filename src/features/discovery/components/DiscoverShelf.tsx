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
import type { ReactNode } from 'react';

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
  /** Controls between the heading and the row (the home page's genre chips, LOOK-3). */
  toolbar?: ReactNode;
  /** The section's id, for links from elsewhere on the page. */
  anchorId?: string;
  /**
   * What the row says when the list is empty. Without it an empty shelf isn't drawn; with it the
   * shelf stays, so its controls stay where the reader left them (LOOK-3).
   */
  emptyNote?: string;
}

/**
 * Renders the shelf, or nothing while it loads or when the list is empty.
 *
 * @returns the shelf section or null
 */
export function DiscoverShelf({
  title,
  eyebrow,
  request,
  toolbar,
  anchorId,
  emptyNote,
}: DiscoverShelfProps) {
  const { shelf } = useStoryShelf(request);
  // Step 1: nothing while the first page loads.
  if (shelf === null) return null;
  // Step 2: an empty list hides the shelf, unless it has a note to show instead.
  if (shelf.stories.length === 0) {
    if (emptyNote === undefined) return null;
    return (
      <Shelf
        eyebrow={eyebrow}
        title={title}
        toolbar={toolbar}
        anchorId={anchorId}
        items={[{ key: 'empty', content: <p className="m-0 text-base text-body">{emptyNote}</p> }]}
      />
    );
  }
  // Step 3: the stories, with the cover designs spread along the row.
  const covers = designsForRow(shelf.stories);
  return (
    <Shelf
      eyebrow={eyebrow}
      title={title}
      seeAllHref={listAddress(request)}
      totalCount={shelf.total}
      toolbar={toolbar}
      anchorId={anchorId}
      items={shelf.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
        ),
      }))}
    />
  );
}
