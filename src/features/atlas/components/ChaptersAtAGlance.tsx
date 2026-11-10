/**
 * ChaptersAtAGlance: the Chapters tile on the at-a-glance page (story S1-E17-06; bundle G10a,
 * board AtlasStory: "Chapters", "15 chapters", "14 published", "Manage chapters").
 *
 * How many chapters there are and how many are published, then "Manage chapters" (S1-E3-04).
 * A story with no chapters offers "Write chapter one" (NewChapterButton, S1-E3-02a). The chapters
 * edited last are listed beside it, in RecentChaptersList.
 * Who uses it: AtAGlance. What it calls: NewChapterButton.
 */
import { Link } from 'react-router';

import { NewChapterButton } from '@/features/writing/components/NewChapterButton';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the tile.
 *
 * @returns the eyebrow, the count and the link or the first-chapter button
 */
export function ChaptersAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { chapterCount, publishedCount } = page.chapters;
  const slug = page.story.slug;
  return (
    <section
      aria-labelledby="atlas-chapters-heading"
      className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-6 py-[22px] shadow-card"
    >
      <h2 id="atlas-chapters-heading" className="eyebrow m-0">
        {t('chapters.heading')}
      </h2>
      {chapterCount === 0 ? (
        <>
          <p className="m-0 text-body">{t('chapters.none')}</p>
          <div className="self-start">
            <NewChapterButton slug={slug} />
          </div>
        </>
      ) : (
        <>
          <p className="m-0 font-heading text-[30px] leading-[1.1] font-extrabold text-heading">
            {t('chapters.count', { count: chapterCount })}
          </p>
          <p className="m-0 text-sm text-meta">
            {t('chapters.published', { published: publishedCount })}
          </p>
          <Link
            to={`/write/s/${slug}/chapters`}
            className="inline-flex min-h-11 items-center self-start text-sm font-semibold"
          >
            {t('chapters.manage')}
          </Link>
        </>
      )}
    </section>
  );
}
