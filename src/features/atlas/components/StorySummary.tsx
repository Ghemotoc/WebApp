/**
 * StorySummary: the story card at the top of the at-a-glance page (story S1-E17-06; redrawn as
 * board E21 in user stories bundle 6).
 *
 * One box with two halves. Left: the 120 px cover, the title, the logline and a meta line with the
 * writer's own writing status first in bold, then the genre, the audience and the publishing
 * route ("Drafting · Fiction · 13+ · Chapter by chapter"). Right: Words (the numbers, a bar and
 * the percentage) and Chapters (the count, how many are out and Manage chapters). On a phone the
 * halves stack.
 * Who uses it: AtAGlance. What it calls: StoryCoverArt and DrawnCover for the cover, MetaLine,
 * WordsProgress and ChaptersAtAGlance.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine } from '@/components/ui/MetaLine';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChaptersAtAGlance } from './ChaptersAtAGlance';
import { WordsProgress } from './WordsProgress';

/** The cover, once the writer's story list has loaded (it holds the cover's choice). */
function SummaryCover({ story }: { story: MyStory | undefined }) {
  if (story === undefined) return null;
  const coverClasses = 'w-24 shrink-0 self-start sm:w-[120px]';
  return (
    <StoryCoverArt
      story={story}
      className={coverClasses}
      drawn={
        <DrawnCover
          title={story.title}
          choice={resolveCoverChoice(story)}
          size="tile"
          isDecorative
          className={coverClasses}
        />
      }
    />
  );
}

/** The title, the logline and the meta line beside the cover. */
function SummaryText({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { t: tWriting } = useTranslation('writing');
  const { plan } = page;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <h2 id="atlas-summary-title" className="m-0 type-heading break-words text-ink-heading">
        {page.story.title}
      </h2>
      <p className="m-0 type-body break-words text-ink-muted">
        {plan.logline === '' ? t('summary.noLogline') : plan.logline}
      </p>
      <MetaLine
        facts={[
          { text: t(`writingStatus.${plan.writingStatus}`), kind: 'state' },
          {
            text: tWriting(`categories.${page.story.categorySlug}`, {
              defaultValue: page.story.categorySlug,
            }),
          },
          { text: tWriting(`rating.${page.story.rating}`) },
          { text: t(`publishingRoute.${plan.publishingRoute}`) },
        ]}
      />
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.page - the plan, from story_plan()
 * @param props.story - the same story from the writer's list (for the cover); undefined while loading
 * @returns the box with the story on the left and its words and chapters on the right
 */
export function StorySummary({ page, story }: { page: StoryPlanPage; story: MyStory | undefined }) {
  const { t } = useAtlasTranslation();
  return (
    <section
      aria-label={t('summary.heading')}
      className="grid min-w-0 items-center gap-8 rounded-card border border-border bg-surface p-6 shadow-card md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12 lg:p-8"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
        <SummaryCover story={story} />
        <SummaryText page={page} />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <WordsProgress
          wordsWritten={page.chapters.wordsWritten}
          wordTarget={page.plan.wordTarget}
        />
        <ChaptersAtAGlance page={page} />
      </div>
    </section>
  );
}
