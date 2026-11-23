/**
 * StoryResultRow: one story a search found, as a row on phones (bundle CALM-7c; board
 * simplified/New-PhoneSearch): a small cover, the title, then two meta lines, the writer and the
 * chapters, and the category, the rating and "Ongoing" in bold while it is being written.
 *
 * The whole row is one link to the story page, so it is one stop for the keyboard. The cover is
 * decorative because the title sits right beside it as text (DoD covers).
 * Who uses it: SearchGroupRows. What it calls: StoryCoverArt and DrawnCover for the cover.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * The second meta line: the category, the rating, then "Ongoing" in bold (handover Step 3).
 *
 * @param story - the story
 * @param tWriting - the writing namespace, where the category, rating and state words live
 * @returns the facts, in reading order
 */
function storyFacts(story: ListedStory, tWriting: TFunction<'writing'>) {
  const facts: MetaFact[] = [
    { text: tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }) },
    { text: tWriting(`rating.${story.rating}`) },
  ];
  if (story.completionStatus === 'ongoing') {
    facts.push({ text: tWriting('status.ongoing'), kind: 'state' });
  }
  return facts;
}

/**
 * Renders the row.
 *
 * @param props.story - the story
 * @param props.cover - the automatic cover this list gives it
 * @returns one list item
 */
export function StoryResultRow({ story, cover }: { story: ListedStory; cover: DrawnCoverChoice }) {
  const { t } = useSearchTranslation();
  const { t: tWriting } = useTranslation('writing');
  return (
    <li className="border-t border-hairline first:border-t-0">
      <Link
        to={`/s/${story.slug}`}
        className="flex min-h-11 items-center gap-4 py-3 text-ink-muted no-underline hover:bg-tint"
      >
        <StoryCoverArt
          story={story}
          className="w-10 shrink-0"
          drawn={
            <DrawnCover
              title={story.title}
              choice={cover}
              size="tile"
              isDecorative
              className="w-10 shrink-0"
            />
          }
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-body leading-5 font-semibold break-words text-ink-heading">
            {story.title}
          </span>
          <MetaLine
            facts={[
              { text: story.writer.displayName },
              { text: t('results.chapters', { count: story.chapterCount }) },
            ]}
          />
          <MetaLine facts={storyFacts(story, tWriting)} />
        </span>
      </Link>
    </li>
  );
}
