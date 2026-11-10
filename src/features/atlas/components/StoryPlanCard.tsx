/**
 * StoryPlanCard: one story's plan as a glass card on /plan (bundle G10 ATLAS, part a; board
 * AtlasHome, handoff A1: "All plans cards: status, genre, logline, words of target").
 *
 * The cover on the left; on the right the writing status and genre pills, the title (a link to
 * the plan, stretched over the whole card so the card is one big target), the logline, and the
 * words against the target. The title alone names the link, so a screen reader doesn't read the
 * whole card as the link's name.
 * Who uses it: AtlasHomePage. What it calls: StoryCoverArt and DrawnCover for the cover,
 * WritingStatusPill and PlanWordsBar.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanSummary } from '../api/storyPlanList';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanWordsBar } from './PlanWordsBar';
import { WritingStatusPill } from './WritingStatusPill';

/** The writing status and genre pills above the title. */
function PlanPills({ story, plan }: { story: MyStory; plan: StoryPlanSummary }) {
  const { t: tWriting } = useTranslation('writing');
  return (
    <div className="flex flex-wrap gap-2">
      <WritingStatusPill status={plan.writingStatus} />
      <InfoPill tone="neutral">
        {tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug })}
      </InfoPill>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.story - the story, from the writer's own list (title, genre, cover)
 * @param props.plan - its plan's summary, from my_story_plans()
 * @param props.cover - the drawn cover to show when there is no uploaded one
 * @returns the card
 */
export function StoryPlanCard({
  story,
  plan,
  cover,
}: {
  story: MyStory;
  plan: StoryPlanSummary;
  cover: DrawnCoverChoice;
}) {
  const { t } = useAtlasTranslation();
  const headingId = `atlas-plan-${story.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="relative flex min-w-0 items-start gap-[18px] rounded-card border border-border bg-surface p-[18px] shadow-card hover:bg-tint"
    >
      <StoryCoverArt
        story={story}
        className="w-20 shrink-0 sm:w-24"
        drawn={
          <DrawnCover
            title={story.title}
            choice={cover}
            size="tile"
            isDecorative
            className="w-20 shrink-0 sm:w-24"
          />
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <PlanPills story={story} plan={plan} />
        <h2
          id={headingId}
          className="m-0 font-heading text-[22px] leading-[1.15] font-bold break-words text-heading"
        >
          {/* The link covers the whole card (after:inset-0), so anywhere on it opens the plan. */}
          <Link
            to={`/plan/s/${story.slug}`}
            className="text-heading no-underline after:absolute after:inset-0 after:rounded-card hover:underline"
          >
            {story.title}
          </Link>
        </h2>
        {plan.logline !== '' && (
          <p className="m-0 text-sm leading-normal break-words text-meta">{plan.logline}</p>
        )}
        <PlanWordsBar
          id={`atlas-plan-words-${story.id}`}
          wordsWritten={plan.wordsWritten}
          wordTarget={plan.wordTarget}
          label={t('words.heading')}
        />
      </div>
    </article>
  );
}
