/**
 * MyStoriesShelf: "Written by you" in the Library, the writer's own stories, drafts included
 * (bundle NAV-1; Robert, 6 Nov 2026, 18:40 UTC: "It's a bit confusing to see your stories. Like,
 * you need to go and press on Write so you can see them. I'd rather see them connected to
 * library").
 *
 * As drawn on the full canvas (board C01-Library; Robert, 25 Nov 2026, 09:50 UTC: no widget
 * missing between the canvas and the live site): one row of covers across the page, the shared
 * Shelf, with "Open Write" at the top right beside the arrows. Each card is one link to the
 * story's chapters in the writing tools (/write/s/<story>/chapters), with a meta line saying the
 * state, then who can read it ("Draft · Private", "Ongoing · Public"). Under the row, one line
 * says drafts show here and only the writer sees them. A deleted story (still restorable for 30
 * days) is left out, as on Write. With no stories, a line says where they will appear and links
 * to a new story. (It was a list of rows in a right-hand column in bundle CALM-7c.)
 * Who shows it: LibraryPage. What it calls: useMyStories (the writing feature's read of the
 * writer's own stories), Shelf and StoryCard.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import type { MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
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

/**
 * One card in the row: the cover and title linking to the story's chapters in the writing
 * tools, then the meta line ("Draft · Private").
 */
function MyStoryCard({ story, cover }: { story: MyStory; cover: DrawnCoverChoice }) {
  const { t } = useLibraryTranslation();
  const { t: tWriting } = useTranslation('writing');
  const visibilityText = tWriting(`visibility.options.${story.visibility}`);
  const metaLine = storyFacts(story, t, visibilityText)
    .map((fact) => fact.text)
    .join(' · ');
  return (
    <StoryCard
      title={story.title}
      metaLine={metaLine}
      cover={cover}
      href={`/write/s/${encodeURIComponent(story.slug)}/chapters`}
      wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-full" />}
    />
  );
}

/** "Open Write", the link at the top right of the row or of the empty section. */
function OpenWriteLink() {
  const { t } = useLibraryTranslation();
  return (
    <Link
      to="/write"
      className="inline-flex min-h-11 items-center type-body font-semibold text-link underline"
    >
      {t('shelves.mine.openWrite')}
    </Link>
  );
}

/** The section's heading with "Open Write" at the top right, for the empty and error states. */
function WrittenByYouHeading() {
  const { t } = useLibraryTranslation();
  return (
    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="library-mine-heading" className="m-0 type-heading">
        {t('shelves.mine.label')}
      </h2>
      <OpenWriteLink />
    </div>
  );
}

/** The heading and a line, while there is no row to show: an error, or no stories yet. */
function WrittenByYouWithoutRow({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="library-mine-heading" className="flex min-w-0 flex-col">
      <WrittenByYouHeading />
      {children}
    </section>
  );
}

/**
 * Renders the section: the writer's stories as one row of covers, with "Open Write" at the top
 * right and the line under it saying drafts show here and only the writer sees them (board C01).
 *
 * @returns the row, an empty line with a way to start, or a plain error; nothing while loading
 */
export function MyStoriesShelf() {
  const { t } = useLibraryTranslation();
  const { stories, isKnown, loadFailed } = useMyStories();
  // Step 1: a failed read says so in plain words; nothing shows while it loads.
  if (loadFailed) {
    return (
      <WrittenByYouWithoutRow>
        <Notice tone="error">{t('shelves.mine.loadFailed')}</Notice>
      </WrittenByYouWithoutRow>
    );
  }
  if (!isKnown) return null;
  // Step 2: no stories yet: say where they will appear and how to start one.
  const live = liveOwnStories(stories);
  if (live.length === 0) {
    return (
      <WrittenByYouWithoutRow>
        <div className="flex flex-col items-start gap-2">
          <p className="m-0 type-body text-ink-muted">{t('shelves.empty.mine')}</p>
          <Link to="/write/new" className="type-body font-semibold text-link underline">
            {t('shelves.mine.newStory')}
          </Link>
        </div>
      </WrittenByYouWithoutRow>
    );
  }
  // Step 3: one row of covers, worked out together so neighbours differ (S1-E3-13), then the
  // line that says who sees it.
  const covers = designsForRow(live);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Shelf
        title={t('shelves.mine.label')}
        anchorId="library-mine"
        headerAction={<OpenWriteLink />}
        items={live.map((story, index) => ({
          key: story.slug,
          content: (
            <MyStoryCard story={story} cover={covers[index] ?? automaticCoverFor(story.id)} />
          ),
        }))}
      />
      <p className="m-0 type-meta text-ink-muted">{t('shelves.empty.mine')}</p>
    </div>
  );
}
