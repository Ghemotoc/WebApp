/**
 * StorySummary: "The story" card at the top of the at-a-glance page (story S1-E17-06: "it shows
 * the title, logline, genre, audience and publishing route"; bundle G10a, board AtlasStory).
 *
 * The cover on the left (the uploaded picture, the drawn cover the writer chose, or the automatic
 * one), then the "The story" eyebrow, the title, the logline and pills for the genre, the audience,
 * the publishing route and the writing status. It shows what is saved, so it follows the details
 * below as each one saves. On a phone the cover sits above the words.
 * Who uses it: AtAGlance. What it calls: StoryCoverArt and DrawnCover, InfoPill and
 * WritingStatusPill.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { WritingStatusPill } from './WritingStatusPill';

/** The cover, once the writer's story list has loaded (it holds the cover's choice). */
function SummaryCover({ story }: { story: MyStory | undefined }) {
  if (story === undefined) return null;
  const coverClasses = 'w-28 shrink-0 self-start sm:w-[140px]';
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

/**
 * Renders the card.
 *
 * @param props.page - the plan, from story_plan()
 * @param props.story - the same story from the writer's list (for the cover); undefined while loading
 * @returns the card with the cover, the title, the logline and the pills
 */
export function StorySummary({ page, story }: { page: StoryPlanPage; story: MyStory | undefined }) {
  const { t } = useAtlasTranslation();
  const { t: tWriting } = useTranslation('writing');
  const { plan } = page;
  return (
    <section
      aria-labelledby="atlas-summary-heading"
      className="flex min-w-0 flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card sm:flex-row sm:p-7"
    >
      <SummaryCover story={story} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p id="atlas-summary-heading" className="eyebrow m-0">
          {t('summary.heading')}
        </p>
        <h2
          id="atlas-summary-title"
          className="m-0 font-heading text-[clamp(26px,2.6vw,34px)] leading-[1.08] font-extrabold break-words text-heading"
        >
          {page.story.title}
        </h2>
        <p className="m-0 text-[17px] leading-normal break-words text-meta">
          {plan.logline === '' ? t('summary.noLogline') : plan.logline}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          <li>
            <InfoPill tone="neutral">
              {tWriting(`categories.${page.story.categorySlug}`, {
                defaultValue: page.story.categorySlug,
              })}
            </InfoPill>
          </li>
          <li>
            <InfoPill tone="neutral">{tWriting(`rating.${page.story.rating}`)}</InfoPill>
          </li>
          <li>
            <InfoPill tone="neutral">{t(`publishingRoute.${plan.publishingRoute}`)}</InfoPill>
          </li>
          <li>
            <WritingStatusPill status={plan.writingStatus} />
          </li>
        </ul>
      </div>
    </section>
  );
}
