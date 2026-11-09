/**
 * MyStoriesShelf: the "My stories" shelf in the Library, the writer's own stories, drafts
 * included (bundle NAV-1; Robert, 6 Nov 2026, 18:40 UTC: "It's a bit confusing to see your
 * stories. Like, you need to go and press on Write so you can see them. I'd rather see them
 * connected to library").
 *
 * It is the shared Shelf like the other library shelves: one scrolling line of at most 20, with a
 * "View more" card when there are more (CLAUDE.md rule 20). Each card opens the story's chapter
 * list in the writing tools (/write/s/<story>/chapters), where the writer can open any chapter in
 * the editor. Under the shelf, a link goes to "Writing" (/write) for the dashboard, the
 * numbers and "+ New story". A deleted story (still restorable for 30 days) is left out, as on
 * "Writing".
 * Who shows it: LibraryShelves, when the "My stories" chip is chosen.
 * What it calls: useMyStories (the writing feature's read of the writer's own stories).
 */
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { liveOwnStories } from '../lib/ownStories';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/**
 * The line under a card's cover: "Draft" until the first chapter is published, then Ongoing or
 * Completed (S1-E3-05).
 *
 * @param story - the writer's story
 * @param t - the library translations
 * @returns the line, in the reader's language
 */
function statusLine(story: MyStory, t: (key: string) => string): string {
  if (story.firstPublishedAt === null) return t('shelves.mine.draft');
  return t(`shelves.mine.${story.completionStatus}`);
}

/** One card: the story's cover and title, linking to its chapters in the writing tools. */
function MyStoryCard({ story, cover }: { story: MyStory; cover: DrawnCoverChoice }) {
  const { t } = useLibraryTranslation();
  return (
    <StoryCard
      title={story.title}
      metaLine={statusLine(story, t)}
      cover={cover}
      href={`/write/s/${encodeURIComponent(story.slug)}/chapters`}
      wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-[165px]" />}
    />
  );
}

/** The link to "Writing", under the shelf or in the empty state. */
function YourWritingLink() {
  const { t } = useLibraryTranslation();
  return (
    <Link to="/write" className="self-start text-sm font-semibold text-link underline">
      {t('shelves.mine.yourWriting')}
    </Link>
  );
}

/**
 * Renders the shelf.
 *
 * @returns the writer's stories, an empty state with a way to start one, or a plain error
 */
export function MyStoriesShelf() {
  const { t } = useLibraryTranslation();
  const { stories, isKnown, loadFailed } = useMyStories();

  // Step 1: a failed read says so in plain words; nothing shows while it loads.
  if (loadFailed) return <Notice tone="error">{t('shelves.mine.loadFailed')}</Notice>;
  if (!isKnown) return null;

  // Step 2: no stories yet: say where they will appear and how to start one.
  const live = liveOwnStories(stories);
  if (live.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <EmptyState title={t('shelves.mine.label')} description={t('shelves.empty.mine')} />
        <Link to="/write/new" className="self-start text-sm font-semibold text-link underline">
          {t('shelves.mine.newStory')}
        </Link>
      </div>
    );
  }

  // Step 3: the shelf, with covers worked out per row so neighbours never share a design (S1-E3-13).
  const covers = designsForRow(live);
  return (
    <div className="flex flex-col gap-3">
      <Shelf
        title={t('shelves.mine.label')}
        seeAllHref="/write"
        totalCount={live.length}
        items={live.map((story, index) => ({
          key: story.slug,
          content: (
            <MyStoryCard story={story} cover={covers[index] ?? automaticCoverFor(story.id)} />
          ),
        }))}
      />
      <YourWritingLink />
    </div>
  );
}
