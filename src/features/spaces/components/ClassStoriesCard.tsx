/**
 * ClassStoriesCard: "Stories shared with the class" on a class space's page (bundle CLASSES,
 * part c; story S1-E8-11).
 *
 * What it shows: one scrolling line of the stories members shared only with this class (at most
 * 20, then "View more" to /spaces/<slug>/stories, CLAUDE.md rule 20), and a line saying only the
 * class reads them until the writer makes them public, never the teacher. With none yet, it says
 * how to share one. No ad or banner sits beside it (Robert, 2 Nov 2026: class spaces never have
 * ads).
 * Who shows it: SpacePage, above the threads of a class space the viewer may read.
 * What it calls: useClassSpaceStories() → class_space_stories().
 */
import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { Shelf } from '@/components/ui/Shelf';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';

import type { Space } from '../api/spaces';
import { useClassSpaceStories } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the shelf, or the empty and error notes
 */
export function ClassStoriesCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const read = useClassSpaceStories(space.slug);
  const stories = read.data ?? [];
  const covers = designsForRow(stories);
  if (read.isError) return <Notice tone="error">{t('classStories.loadFailed')}</Notice>;
  if (!read.isSuccess) return null;
  if (stories.length === 0) {
    return (
      <section
        aria-labelledby="class-stories-heading"
        className="flex flex-col gap-2 rounded-card border border-border bg-surface px-6 py-5 shadow-card"
      >
        <Eyebrow>{t('classStories.eyebrow')}</Eyebrow>
        <h2 id="class-stories-heading" className="m-0 font-heading text-2xl font-bold text-heading">
          {t('classStories.title')}
        </h2>
        <p className="m-0 text-sm text-body">{t('classStories.empty')}</p>
      </section>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Shelf
        eyebrow={t('classStories.eyebrow')}
        title={t('classStories.title')}
        seeAllHref={`/spaces/${space.slug}/stories`}
        items={stories.map((story, index) => ({
          key: story.slug,
          content: (
            <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
          ),
        }))}
      />
      <p className="m-0 text-sm text-body">{t('classStories.note', { name: space.name })}</p>
    </div>
  );
}
