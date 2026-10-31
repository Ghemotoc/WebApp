/**
 * ChaptersAtAGlance: the chapters on the at-a-glance page (story S1-E17-06: "the recently edited
 * chapters ... show, each linking to its item").
 *
 * How many chapters there are and how many are published, then the five edited most recently,
 * each opening in the chapter editor (S1-E3-02a), and "Manage chapters" (S1-E3-04). The planning
 * status of each chapter (Idea to Done) joins in part e of the bundle (S1-E17-23). A story with no
 * chapters offers "Write chapter one" (NewChapterButton, S1-E3-02a).
 * Who uses it: StoryAtlasPage.
 */
import { Link } from 'react-router';

import { NewChapterButton } from '@/features/writing/components/NewChapterButton';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** One recent chapter's line: its number and title, or its number alone. */
function chapterName(
  chapter: StoryPlanPage['chapters']['recent'][number],
  t: (key: string, values: Record<string, unknown>) => string,
): string {
  if (chapter.title.trim() === '')
    return t('chapters.chapterUntitled', { number: chapter.position });
  return t('chapters.chapterTitle', { number: chapter.position, title: chapter.title });
}

/**
 * Renders the chapters card.
 *
 * @returns the heading, the counts and the recent chapters
 */
export function ChaptersAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { chapterCount, publishedCount, recent } = page.chapters;
  const slug = page.story.slug;
  return (
    <section
      aria-labelledby="atlas-chapters-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-chapters-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
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
        <p className="m-0 text-body">
          {t('chapters.count', { count: chapterCount })} ·{' '}
          {t('chapters.published', { published: publishedCount })}
        </p>
      )}
      {recent.length > 0 && (
        <>
          <h3 className="m-0 text-sm font-semibold text-ink">{t('chapters.recent')}</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {recent.map((chapter) => (
              <li key={chapter.code} className="border-t border-border first:border-t-0">
                <Link
                  to={`/write/s/${slug}/c/${chapter.code}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold break-words"
                >
                  {chapterName(chapter, t)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {chapterCount > 0 && (
        <Link
          to={`/write/s/${slug}/chapters`}
          className="inline-flex min-h-11 items-center self-start text-sm font-semibold"
        >
          {t('chapters.manage')}
        </Link>
      )}
    </section>
  );
}
