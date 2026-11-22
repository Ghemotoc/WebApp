/**
 * DiscoverShelf: one shelf on Discover, filled from one story list (story S1-E5-01; board 3.1).
 *
 * The shelf is the shared Shelf: one scrolling line of at most 20, then a "View more" card to the
 * list's See all page (S1-E5-09; CLAUDE.md rule 20), with Previous and Next beside "View" (no
 * fades since CALM-4). On the Read page the heading is plain, with no eyebrow (CALM-7c), and the
 * follows row says when each story last had a chapter.
 * An empty list draws nothing, so Discover never shows an empty row; while it loads, nothing
 * either, so the page doesn't jump.
 * Who uses it: DiscoverPage, PopularShelf and the website's HomeShelves. What it calls:
 * useStoryShelf → browse_stories() and timeAgo.
 */
import type { ReactNode } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ListRequest, ListedStory } from '../api/storyLists';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { listAddress } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ListedStoryCard } from './ListedStoryCard';

/**
 * The follows row's line under a title: the writer, then how long ago the latest chapter came out.
 *
 * @param story - the story
 * @param language - the interface language, for "2 hours ago"
 * @returns the line, or undefined (the card's usual line) when no chapter date is known
 */
function whenLine(story: ListedStory, language: string): string | undefined {
  if (story.lastChapterPublishedAt === null) return undefined;
  return `${story.writer.displayName} · ${timeAgo(story.lastChapterPublishedAt, language)}`;
}

/** What a shelf needs. */
export interface DiscoverShelfProps {
  title: string;
  /** The small label above the heading; the Read page's rows have none since CALM-7c. */
  eyebrow?: string;
  request: ListRequest;
  /**
   * True for "New from writers you follow": each card says when the story last had a chapter
   * ("poppyverse · 2 hours ago"; board New-Read) instead of its chapter count.
   */
  isFollowingRow?: boolean;
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
  isFollowingRow = false,
}: DiscoverShelfProps) {
  const { i18n } = useDiscoveryTranslation();
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
          <ListedStoryCard
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
            metaLine={isFollowingRow ? whenLine(story, i18n.language) : undefined}
          />
        ),
      }))}
    />
  );
}
