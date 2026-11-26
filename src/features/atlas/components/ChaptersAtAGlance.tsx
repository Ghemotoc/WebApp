/**
 * ChaptersAtAGlance: the Chapters block in the story card at the top of the at-a-glance page
 * (story S1-E17-06; redrawn as board E21 in user stories bundle 6: "Chapters", "16 chapters",
 * "15 published · 1 draft", "Manage chapters").
 *
 * How many chapters there are, how many are out and how many are not yet, then "Manage chapters"
 * (S1-E3-04). A story with no chapters offers "Write chapter one" (NewChapterButton, S1-E3-02a).
 * The chapters edited last are listed further down, in RecentChaptersList.
 * Who uses it: StorySummary. What it calls: NewChapterButton.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { NewChapterButton } from '@/features/writing/components/NewChapterButton';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Words the published line: "15 published · 1 draft", or "8 published" when every chapter is out.
 *
 * @param t - the Atlas translator
 * @param chapterCount - the story's chapters
 * @param publishedCount - how many of them are out
 * @returns the line under the count
 */
function publishedLine(
  t: ReturnType<typeof useAtlasTranslation>['t'],
  chapterCount: number,
  publishedCount: number,
): string {
  const published = t('chapters.published', { published: publishedCount });
  const notYetOut = chapterCount - publishedCount;
  if (notYetOut === 0) return published;
  return `${published} · ${t('chapters.drafts', { count: notYetOut })}`;
}

/**
 * Renders the block.
 *
 * @param props.page - the plan, from story_plan()
 * @returns the label, the count, the published line and the link, or the first-chapter button
 */
export function ChaptersAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { chapterCount, publishedCount } = page.chapters;
  const slug = page.story.slug;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 className="m-0 type-label text-ink-heading">{t('chapters.heading')}</h3>
      {chapterCount === 0 ? (
        <>
          <p className="m-0 type-body text-ink-muted">{t('chapters.none')}</p>
          <div className="mt-2 self-start">
            <NewChapterButton slug={slug} />
          </div>
        </>
      ) : (
        <>
          <p className="m-0 type-subheading text-ink-heading">
            {t('chapters.count', { count: chapterCount })}
          </p>
          <p className="m-0 type-meta">{publishedLine(t, chapterCount, publishedCount)}</p>
          <Link
            to={`/write/s/${slug}/chapters`}
            className={`${buttonClassName({ variant: 'text' })} self-start`}
          >
            {t('chapters.manage')}
          </Link>
        </>
      )}
    </div>
  );
}
