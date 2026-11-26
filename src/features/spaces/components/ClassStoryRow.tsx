/**
 * ClassStoryRow: one story shared with a class, as a row (bundle BOOKS-8; boards G03-Class and
 * G04-ClassStories, user stories 8.3 and 8.4).
 *
 * Who shows it: ClassSharedStories (the class page's right column).
 * What it shows: a small cover, the title, then "Class only" in bold, the pen name and the number
 * of chapters; the whole row is one link to the story.
 * What it calls: StoryCoverArt and DrawnCover.
 */
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
 * @returns the list item
 */
export function ClassStoryRow({ story, cover }: { story: ListedStory; cover: DrawnCoverChoice }) {
  const { t } = useSpacesTranslation();
  return (
    <li className="border-t border-hairline">
      <Link
        to={`/s/${story.slug}`}
        className="flex min-h-11 items-center gap-4 py-3 text-ink-muted no-underline hover:bg-tint"
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
    </li>
  );
}
