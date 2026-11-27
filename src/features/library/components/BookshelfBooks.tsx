/**
 * BookshelfBooks: the books on a bookshelf's own page, as drawn on board C02 (Robert, 25 Nov
 * 2026, 09:50 UTC: no widget missing between the canvas and the live site; bundle GAPS-6 built
 * the page as a grid of story cards with the owner's Remove rows in a separate card).
 *
 * The rules:
 *   - Each book is the shared StoryCard (the cover, the title and the writer, one link to the
 *     story), 5 a line from 900 px, 3 from 600 px and 2 on phones, so the grid never scrolls
 *     sideways. A bookshelf holds at most 10 books, so there is no "View more" (DoD shelves: the
 *     bookshelf is the one grid exception, CALM-4).
 *   - For the owner, "Remove" sits under each book, named after it, and dashed ghost places fill
 *     the shelf up to the number one bookshelf holds; the first ghost is the "+" that leads to
 *     Discover, as on the Library's bookshelf rows.
 *   - A story on the owner's bookshelf that the owner may not see any more (a rating, a block or
 *     a moderator's decision) has no cover to show; it stays as a row with its title and Remove,
 *     so it can still be taken off.
 *   - Anyone else sees only the books, or one line when the bookshelf is empty.
 * Who uses it: ReadingListPage. What it calls: StoryCard, StoryCoverArt, the ghost place from
 * BookshelfPlaces and useRemoveFromBookshelf.
 */
import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { StoryCard } from '@/components/ui/StoryCard';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ReadingListDetails, ReadingListEntry } from '../api/readingLists';
import { useRemoveFromBookshelf } from '../hooks/useRemoveFromBookshelf';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { FindStoriesPlace, ghostClasses } from './BookshelfPlaces';

/** The grid: 2 a line on phones, 3 from 600 px, 5 from 900 px (board C02). */
const booksGrid =
  'm-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 min-[600px]:grid-cols-3 min-[600px]:gap-x-6 min-[900px]:grid-cols-5';

/** What the Remove button needs: the action, or nothing for a reader who isn't the owner. */
type RemoveStory = ((storySlug: string, title: string) => Promise<void>) | null;

/** "Remove", named after the story ("Remove The Salt Mine Choir"). */
function RemoveButton({ entry, onRemove }: { entry: ReadingListEntry; onRemove: RemoveStory }) {
  const { t } = useLibraryTranslation();
  if (onRemove === null) return null;
  return (
    <Button
      variant="text"
      className="self-start"
      aria-label={t('lists.page.removeLabel', { title: entry.title })}
      onClick={() => void onRemove(entry.slug, entry.title)}
    >
      {t('lists.page.remove')}
    </Button>
  );
}

/** One book: the shared card, then Remove for the owner. */
function BookCard(props: { story: ListedStory; cover: DrawnCoverChoice; onRemove: RemoveStory }) {
  const { story } = props;
  return (
    <li className="flex min-w-0 flex-col gap-1">
      <StoryCard
        title={story.title}
        metaLine={story.writer.displayName}
        cover={props.cover}
        coverPenName={story.writer.displayName}
        href={`/s/${story.slug}`}
        wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-full" />}
      />
      <RemoveButton entry={story} onRemove={props.onRemove} />
    </li>
  );
}

/** The empty places after the books, the first one leading to Discover. */
function GhostPlaces({ count, name }: { count: number; name: string }) {
  return Array.from({ length: count }, (_, index) => (
    <li key={`ghost-${String(index)}`} className="min-w-0">
      {index === 0 ? (
        <FindStoriesPlace name={name} />
      ) : (
        <span aria-hidden="true" className={ghostClasses} />
      )}
    </li>
  ));
}

/** The owner's stories that have no cover to show here, each with its Remove. */
function HiddenEntries(props: { entries: ReadingListEntry[]; onRemove: RemoveStory }) {
  if (props.entries.length === 0) return null;
  return (
    <ul className="m-0 list-none p-0">
      {props.entries.map((entry) => (
        <li
          key={entry.slug}
          className="flex items-center justify-between gap-3 border-t border-(--hairline) py-2"
        >
          <span className="min-w-0 break-words text-ink-heading">{entry.title}</span>
          <RemoveButton entry={entry} onRemove={props.onRemove} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the books, and for the owner the places left and the Remove buttons.
 *
 * @param props.list - the bookshelf, with its books (covers) and, for the owner, its entries
 * @param props.places - how many books one bookshelf holds (reading_list_stories_max)
 * @returns the grid, or one line for someone else's empty bookshelf
 */
export function BookshelfBooks({ list, places }: { list: ReadingListDetails; places: number }) {
  const { t } = useLibraryTranslation();
  const { remove, hasFailed } = useRemoveFromBookshelf(list.id);
  // Step 1: someone else's empty bookshelf says so in one line.
  if (!list.isOwn && list.covers.length === 0) {
    return (
      <EmptyState title={t('lists.page.emptyTitle')} description={t('lists.page.emptyOther')} />
    );
  }
  // Step 2: the books, worked out together so neighbours never share a design (S1-E3-13).
  const covers = designsForRow(list.covers);
  const onRemove: RemoveStory = list.isOwn ? remove : null;
  const shownSlugs = new Set(list.covers.map((story) => story.slug));
  const hiddenEntries = list.entries.filter((entry) => !shownSlugs.has(entry.slug));
  // Step 3: for the owner, the places left on the shelf.
  const ghostCount = list.isOwn
    ? Math.max(0, places - list.covers.length - hiddenEntries.length)
    : 0;
  return (
    <div className="flex flex-col gap-4">
      <ul className={booksGrid}>
        {list.covers.map((story, index) => (
          <BookCard
            key={story.slug}
            story={story}
            cover={covers[index] ?? automaticCoverFor(story.id)}
            onRemove={onRemove}
          />
        ))}
        <GhostPlaces count={ghostCount} name={list.name} />
      </ul>
      <HiddenEntries entries={hiddenEntries} onRemove={onRemove} />
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('lists.errors.saveFailed')}</Notice>}
      </div>
    </div>
  );
}
