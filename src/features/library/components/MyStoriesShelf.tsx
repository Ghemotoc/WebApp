/**
 * MyStoriesShelf: "Written by you" in the Library, the writer's own stories, drafts included
 * (bundle NAV-1; Robert, 6 Nov 2026, 18:40 UTC: "It's a bit confusing to see your stories. Like,
 * you need to go and press on Write so you can see them. I'd rather see them connected to
 * library").
 *
 * Simplified look (bundle CALM-7c, board New-Library): its own section in the right-hand column,
 * with "Open Write" at the top right and one row per story split by the hairline: a 56 px cover,
 * the title linking to the story's chapters in the writing tools (/write/s/<story>/chapters), and
 * a meta line with the state in bold while it is a draft, then who can read it ("Draft ·
 * Private", "Ongoing · Public"). A deleted story (still restorable for 30 days) is left out, as
 * on Write. With no stories, a line says where they will appear and links to a new story.
 * Who shows it: LibraryPage. What it calls: useMyStories (the writing feature's read of the
 * writer's own stories).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { liveOwnStories } from '../lib/ownStories';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/**
 * The row's meta line: "Draft" in bold until the first chapter is published, else Ongoing or
 * Completed (S1-E3-05); then who can read it (NEW-1).
 *
 * @param story - the writer's story
 * @param t - the library translations
 * @param visibilityText - who can read it, already translated
 * @returns the facts, in reading order
 */
function storyFacts(
  story: MyStory,
  t: (key: string) => string,
  visibilityText: string,
): MetaFact[] {
  if (story.firstPublishedAt === null) {
    return [{ text: t('shelves.mine.draft'), kind: 'state' }, { text: visibilityText }];
  }
  return [{ text: t(`shelves.mine.${story.completionStatus}`) }, { text: visibilityText }];
}

/** One row: the cover, the title linking to its chapters, and its meta line. */
function MyStoryRow({ story, cover }: { story: MyStory; cover: DrawnCoverChoice }) {
  const { t } = useLibraryTranslation();
  const { t: tWriting } = useTranslation('writing');
  const visibilityText = tWriting(`visibility.options.${story.visibility}`);
  return (
    <li className="flex items-center gap-4 border-t border-(--hairline) py-3">
      <StoryCoverArt
        story={story}
        className="w-14 shrink-0"
        drawn={
          <DrawnCover
            title={story.title}
            choice={cover}
            size="tile"
            isDecorative
            className="w-14 shrink-0"
          />
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/write/s/${encodeURIComponent(story.slug)}/chapters`}
          className="font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <MetaLine facts={storyFacts(story, t, visibilityText)} />
      </div>
    </li>
  );
}

/** The section's heading with "Open Write" at the top right. */
function WrittenByYouHeading() {
  const { t } = useLibraryTranslation();
  return (
    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="library-mine-heading" className="m-0 type-heading">
        {t('shelves.mine.label')}
      </h2>
      <Link
        to="/write"
        className="inline-flex min-h-11 items-center type-body font-semibold text-link underline"
      >
        {t('shelves.mine.openWrite')}
      </Link>
    </div>
  );
}

/** The rows, or what to do when there are none yet. */
function WrittenByYouBody() {
  const { t } = useLibraryTranslation();
  const { stories, isKnown, loadFailed } = useMyStories();
  // Step 1: a failed read says so in plain words; nothing shows while it loads.
  if (loadFailed) return <Notice tone="error">{t('shelves.mine.loadFailed')}</Notice>;
  if (!isKnown) return null;
  // Step 2: no stories yet: say where they will appear and how to start one.
  const live = liveOwnStories(stories);
  if (live.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="m-0 type-body text-ink-muted">{t('shelves.empty.mine')}</p>
        <Link to="/write/new" className="type-body font-semibold text-link underline">
          {t('shelves.mine.newStory')}
        </Link>
      </div>
    );
  }
  // Step 3: one row per story, covers worked out together so neighbours differ (S1-E3-13).
  const covers = designsForRow(live);
  return (
    <ul className="m-0 list-none p-0">
      {live.map((story, index) => (
        <MyStoryRow
          key={story.slug}
          story={story}
          cover={covers[index] ?? automaticCoverFor(story.id)}
        />
      ))}
    </ul>
  );
}

/**
 * Renders the section.
 *
 * @returns "Written by you" with its rows, an empty line with a way to start, or a plain error
 */
export function MyStoriesShelf() {
  return (
    <section aria-labelledby="library-mine-heading" className="flex min-w-0 flex-col">
      <WrittenByYouHeading />
      <WrittenByYouBody />
    </section>
  );
}
