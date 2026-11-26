/**
 * ClassSharedStories: "Stories shared with the class" beside a class page's threads (bundle
 * BOOKS-8; board G03-Class, user story 8.3; it replaces the shelf of CLASSES part c).
 *
 * Who shows it: ClassSpaceContent, in the right column, for a viewer who may read the class.
 * What it shows (board G03): the heading, "6 stories. Only the class can read them.", the three
 * stories updated last as rows (a small cover, the title, then "Class only · pen name · 1 chapter")
 * and "Open the stories", which opens every one at /spaces/<slug>/stories (board G04). With none
 * shared yet it says so.
 * What it calls: useClassSpaceStories → class_space_stories(); ClassStoryRow.
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Notice } from '@/components/ui/Notice';

import { useClassSpaceStories } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassStoryRow } from './ClassStoryRow';

/** How many stories the column shows; "Open the stories" lists them all (board G03). */
const storiesShown = 3;

/**
 * Renders the section.
 *
 * @param props.slug - the class's address
 * @returns the heading, the rows and the link to every story
 */
export function ClassSharedStories({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const read = useClassSpaceStories(slug);
  const stories = read.data ?? [];
  const covers = designsForRow(stories);
  if (read.isError) return <Notice tone="error">{t('classStories.loadFailed')}</Notice>;
  if (!read.isSuccess) return null;
  return (
    <section aria-labelledby="class-stories-heading" className="flex flex-col gap-2">
      <h2 id="class-stories-heading" className="m-0 type-subheading text-ink-heading">
        {t('classStories.title')}
      </h2>
      {stories.length === 0 ? (
        <p className="m-0 type-body text-ink-muted">{t('classStories.empty')}</p>
      ) : (
        <>
          <p className="m-0 type-body text-ink-muted">
            {t('classPage.storiesCount', { count: stories.length })}
          </p>
          <ul className="m-0 flex list-none flex-col p-0" aria-label={t('classStories.title')}>
            {stories.slice(0, storiesShown).map((story, index) => (
              <ClassStoryRow
                key={story.slug}
                story={story}
                cover={covers[index] ?? resolveCoverChoice(story)}
              />
            ))}
          </ul>
          <Link
            to={`/spaces/${slug}/stories`}
            className="w-fit py-2 type-body font-semibold text-ink-heading underline"
          >
            {t('classPage.openStories')}
          </Link>
        </>
      )}
    </section>
  );
}
