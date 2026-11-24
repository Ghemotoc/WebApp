/**
 * LibraryShelves: "Stories in the library" with the Reading, Saved and Finished tabs (story
 * S1-E4-03, second and fifth criteria; board New-Library, bundle CALM-7c).
 *
 * The chosen shelf is the shared Shelf: one scrolling line of at most 20 stories, then a "View
 * more" card to its See all page at /library/<shelf> (CLAUDE.md rule 20; S1-E5-09), whole covers
 * and Previous and Next (CALM-4). Each card shows the full title on its cover and "Fiction ·
 * chapter 14 of 15" under it, from the story's category and the reader's place; on Reading a 2 px
 * thread line under the cover shows how far they got (Shelf/README.md). The tabs are the shared
 * SegmentedControl ("Reading · 5"), a radio group named "Shelf", under the heading. The writer's
 * own stories moved out of these tabs into "Written by you" (MyStoriesShelf) further down the
 * page, as on the board.
 * Who uses it: LibraryPage. What it calls: useStoryShelf → browse_stories('library', <shelf>).
 */
import { useState, type ReactNode } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import {
  libraryShelves,
  type CardPlace,
  type LibraryOverview,
  type LibraryShelf,
} from '../api/library';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/**
 * The place half of the card's line under the title: "not started", "chapter 3 of 15" while the writer has marked
 * a last chapter, or "chapter 3" (CALM-6).
 *
 * @param t - the library namespace's translate function
 * @param place - the reader's place, or undefined
 * @returns the text
 */
function cardPlaceText(
  t: ReturnType<typeof useLibraryTranslation>['t'],
  place: CardPlace | undefined,
): string {
  if (place === undefined) return t('shelves.notStarted');
  if (place.lastChapterNumber === null)
    return t('shelves.chapterNumberOnly', { number: place.number });
  return t('shelves.chapterOf', { number: place.number, total: place.lastChapterNumber });
}

/** One card: the cover, the title, the writer and how far the reader got. */
function LibraryStoryCard(props: {
  story: ListedStory;
  cover: DrawnCoverChoice;
  place: CardPlace | undefined;
  /** True on the Reading chip, where each cover carries its progress line. */
  showsProgress: boolean;
}) {
  const { t } = useLibraryTranslation();
  const { story, cover, place, showsProgress } = props;
  // The progress line: the share of chapters reached, only where the reader has a place.
  const progressPercent =
    showsProgress && place !== undefined && place.total > 0
      ? (place.number / place.total) * 100
      : undefined;
  const progress = cardPlaceText(t, place);
  // Design books item 16: the dot on the cover, and the same in words after the place.
  const hasNewChapter = place?.hasNewChapter === true;
  const newChapter = hasNewChapter ? ` · ${t('shelves.newChapter')}` : '';
  // "Fiction · chapter 14 of 15": the story's category, then the reader's place (board).
  const category = t(`categories.${story.categorySlug}`, {
    ns: 'writing',
    defaultValue: story.categorySlug,
  });
  return (
    <StoryCard
      title={story.title}
      metaLine={`${category} · ${progress}${newChapter}`}
      cover={cover}
      href={`/s/${story.slug}`}
      wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-full" />}
      progressPercent={progressPercent}
      hasNewChapter={hasNewChapter}
    />
  );
}

/** The three tabs, "Reading · 5", as a radio group named "Shelf". */
function ShelfTabs(props: {
  counts: LibraryOverview['counts'];
  shelf: LibraryShelf;
  onChange: (shelf: LibraryShelf) => void;
}) {
  const { t } = useLibraryTranslation();
  return (
    <SegmentedControl
      legend={t('shelves.choose')}
      isLegendVisible={false}
      name="library-shelf"
      options={libraryShelves.map((name) => ({
        value: name,
        label: t('shelves.option', { name: t(`shelves.tabs.${name}`), count: props.counts[name] }),
      }))}
      value={props.shelf}
      onChange={props.onChange}
    />
  );
}

/** The heading and tabs with a line instead of a row: while loading, or for an empty shelf. */
function ShelfWithoutRow(props: { tabs: ReactNode; children?: ReactNode }) {
  const { t } = useLibraryTranslation();
  return (
    <section aria-labelledby="library-shelves-heading" className="flex flex-col gap-4">
      <h2 id="library-shelves-heading" className="m-0 type-heading">
        {t('shelves.heading')}
      </h2>
      {props.tabs}
      {props.children}
    </section>
  );
}

/**
 * Renders the section: the heading, the tabs, then the chosen shelf's row (or a line saying how
 * stories get there).
 *
 * @param props.overview - the shelf sizes and the places
 * @returns the section
 */
export function LibraryShelves({ overview }: { overview: LibraryOverview }) {
  const { t } = useLibraryTranslation();
  const [shelf, setShelf] = useState<LibraryShelf>('reading');
  const request = plainList('library', shelf);
  const { shelf: list } = useStoryShelf(request);
  const tabs = <ShelfTabs counts={overview.counts} shelf={shelf} onChange={setShelf} />;
  // Step 1: while the shelf loads, the heading and tabs stay so the page doesn't jump.
  if (list === null) return <ShelfWithoutRow tabs={tabs} />;
  // Step 2: an empty shelf says how stories get there.
  if (list.stories.length === 0) {
    return (
      <ShelfWithoutRow tabs={tabs}>
        <EmptyState title={t(`shelves.${shelf}`)} description={t(`shelves.empty.${shelf}`)} />
      </ShelfWithoutRow>
    );
  }
  // Step 3: the row, with covers worked out per row so neighbours never share a design (S1-E3-13).
  const covers = designsForRow(list.stories);
  return (
    <Shelf
      title={t('shelves.heading')}
      toolbar={tabs}
      seeAllHref={listAddress(request)}
      totalCount={list.total}
      items={list.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <LibraryStoryCard
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
            place={overview.places[story.slug]}
            showsProgress={shelf === 'reading'}
          />
        ),
      }))}
    />
  );
}
