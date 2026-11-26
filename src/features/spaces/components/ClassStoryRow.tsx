/**
 * ClassStoryRow: one story shared with a class, as a row (bundle BOOKS-8; boards G03-Class and
 * G04-ClassStories, user stories 8.3 and 8.4).
 *
 * Who shows it: ClassSharedStories (the class page's right column) and ClassStoriesPage.
 * What it shows: a small cover, the title, then "Class only" in bold, the pen name and the number
 * of chapters; the cover and words are one link to the story. On the stories page a writer's own
 * story adds "Make public" at the right end (board G04; under the row on phones, so the title
 * keeps its width), outside the link so the two never nest.
 * What it calls: StoryCoverArt and DrawnCover.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { DrawnCover } from '@/components/covers/DrawnCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { MetaLine } from '@/components/ui/MetaLine';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * One story as a row.
 *
 * @param props.story - the story
 * @param props.cover - its automatic or drawn cover
 * @param props.action - a button beside the link (the writer's "Make public"), if any
 * @returns the list item
 */
export function ClassStoryRow({
  story,
  cover,
  action,
}: {
  story: ListedStory;
  cover: DrawnCoverChoice;
  action?: ReactNode;
}) {
  const { t } = useSpacesTranslation();
  return (
    <li className="flex flex-wrap items-center gap-x-4 border-t border-hairline">
      <Link
        to={`/s/${story.slug}`}
        className="flex min-h-11 min-w-0 flex-1 basis-full items-center gap-4 sm:basis-0 py-3 text-ink-muted no-underline hover:bg-tint"
      >
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
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-body font-semibold break-words text-ink-heading">
            {story.title}
          </span>
          <MetaLine
            facts={[
              { text: t('classPage.classOnly'), kind: 'state' },
              { text: story.writer.displayName },
              { text: t('classPage.chapters', { count: story.chapterCount }) },
            ]}
          />
        </span>
      </Link>
      {action !== undefined && <div className="pb-3 sm:pb-0">{action}</div>}
    </li>
  );
}
