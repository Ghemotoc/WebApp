/**
 * LibraryShelves: "Stories in your library" with the Reading, Saved for later and Finished chips
 * (story S1-E4-03, second and fifth criteria; board 3.7 Library).
 *
 * The chosen shelf is the shared Shelf: one scrolling line of at most 20 stories, then a "View
 * more" card to its See all page at /library/<shelf> (CLAUDE.md rule 20; S1-E5-09), a fade at
 * each edge with cards hidden past it and scroll arrows. Each card shows the full title on its cover and "Chapter 14 of
 * 15" under it, from the reader's place. The chips are a radiogroup with a tick on the chosen one
 * (DoD pill system), each with the shelf's size. A fourth chip, "My stories", shows the reader's
 * own stories as a writer, drafts included (MyStoriesShelf; bundle NAV-1, Robert, 6 Nov 2026).
 * Who uses it: LibraryPage. What it calls: useStoryShelf → browse_stories('library', <shelf>),
 * and useMyStories for "My stories".
 */
import { useState } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Doodle } from '@/components/ui/Doodle';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { libraryShelves, type LibraryOverview, type LibraryShelf } from '../api/library';
import { liveOwnStories } from '../lib/ownStories';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { MyStoriesShelf } from './MyStoriesShelf';

/** A chip in the section: one of the reader's shelves, or "mine" for their own stories (NAV-1). */
type LibraryTab = LibraryShelf | 'mine';

/** The chips in the order they show: the three reading shelves, then My stories. */
const libraryTabs: readonly LibraryTab[] = [...libraryShelves, 'mine'];

/** One card: the cover, the title, the writer and how far the reader got. */
function LibraryStoryCard(props: {
  story: ListedStory;
  cover: DrawnCoverChoice;
  place: { number: number; total: number } | undefined;
}) {
  const { t } = useLibraryTranslation();
  const { story, cover, place } = props;
  const progress =
    place === undefined
      ? t('shelves.notStarted')
      : t('shelves.chapterOf', { number: place.number, total: place.total });
  return (
    <StoryCard
      title={story.title}
      metaLine={`${story.writer.displayName} · ${progress}`}
      cover={cover}
      href={`/s/${story.slug}`}
      wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-[165px]" />}
    />
  );
}

/** The chosen shelf's stories, or a line saying how stories get there. */
function ShelfStories({
  shelf,
  places,
}: {
  shelf: LibraryShelf;
  places: LibraryOverview['places'];
}) {
  const { t } = useLibraryTranslation();
  const request = plainList('library', shelf);
  const { shelf: list } = useStoryShelf(request);
  if (list === null) return null;
  if (list.stories.length === 0) {
    return <EmptyState title={t(`shelves.${shelf}`)} description={t(`shelves.empty.${shelf}`)} />;
  }
  const covers = designsForRow(list.stories);
  return (
    <Shelf
      title={t(`shelves.${shelf}`)}
      seeAllHref={listAddress(request)}
      totalCount={list.total}
      items={list.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <LibraryStoryCard
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
            place={places[story.slug]}
          />
        ),
      }))}
    />
  );
}

/**
 * Renders the section.
 *
 * @param props.overview - the shelf sizes and the places
 * @returns the section
 */
export function LibraryShelves({ overview }: { overview: LibraryOverview }) {
  const { t } = useLibraryTranslation();
  const [tab, setTab] = useState<LibraryTab>('reading');
  const { stories } = useMyStories();
  // The size on each chip: the reading shelves from the overview, My stories from the writer's list.
  const counts: Record<LibraryTab, number> = {
    ...overview.counts,
    mine: liveOwnStories(stories).length,
  };
  return (
    <section aria-labelledby="library-shelves-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>{t('shelves.eyebrow')}</Eyebrow>
          <h2
            id="library-shelves-heading"
            className="m-0 font-heading text-[28px] font-bold text-heading"
          >
            {t('shelves.heading')}
          </h2>
        </div>
        {/* The board's books and plant between the heading and the shelf chips (LOOK-5). */}
        <Doodle
          name="books-and-plant"
          kind="widget"
          on="Stories in your library"
          hideBelow="wide"
          className="mr-auto w-[88px] shrink-0 rotate-[4deg]"
        />
        <ChoiceChips
          label={t('shelves.choose')}
          options={libraryTabs.map((name) => ({
            value: name,
            label: t('shelves.option', {
              name: name === 'mine' ? t('shelves.mine.label') : t(`shelves.${name}`),
              count: counts[name],
            }),
          }))}
          value={tab}
          onChange={(value) => setTab(libraryTabs.find((name) => name === value) ?? 'reading')}
        />
      </div>
      {tab === 'mine' ? <MyStoriesShelf /> : <ShelfStories shelf={tab} places={overview.places} />}
    </section>
  );
}
