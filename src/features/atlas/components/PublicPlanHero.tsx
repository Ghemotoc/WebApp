/**
 * PublicPlanHero: the band at the top of a story's public plan (story S1-E17-33; bundles G10
 * ATLAS, part c4, and GAPS-4; boards AtlasPreview, AtlasPreviewArea and AtlasPreviewCharacter).
 *
 * The story's cover, the eyebrow "The story's world", the story's title as the page's heading and
 * "by <pen name> · shared by the writer". For readers the title is a link back to the story's
 * page; in the writer's preview it is plain words, since the story may not be published yet.
 * The cover is decoration here (the title is beside it as text) and goes through StoryCoverArt,
 * so an uploaded picture shows only once its check has passed (CLAUDE.md rule 19).
 * Who uses it: PublicPlanPage and PlanPreviewPage. What it calls: StoryCoverArt and DrawnCover.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { PublicPlan } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The cover's width in the band: the board's 96 px. */
const coverWidth = 'w-24';

/** The story's cover, small, beside the words. */
function HeroCover({ plan }: { plan: PublicPlan }) {
  const choice = resolveCoverChoice({
    id: plan.storyId,
    coverKind: plan.coverKind,
    drawnCover: plan.drawnCover,
  });
  return (
    <div className="flex-none" data-testid="atlas-public-cover">
      <StoryCoverArt
        story={{ slug: plan.storySlug, coverKind: plan.coverKind }}
        className={coverWidth}
        drawn={
          <DrawnCover
            title={plan.storyTitle}
            penName={plan.writerName}
            choice={choice}
            size="tile"
            isDecorative
            className={coverWidth}
          />
        }
      />
    </div>
  );
}

/**
 * Renders the band.
 *
 * @param props.plan - the public plan (the story's title, cover and writer's name)
 * @param props.storyAddress - the story's public page, or null for plain words (the preview)
 * @returns the header
 */
export function PublicPlanHero({
  plan,
  storyAddress,
}: {
  plan: PublicPlan;
  storyAddress: string | null;
}) {
  const { t } = useAtlasTranslation();
  return (
    <header className="flex min-w-0 items-center gap-5 rounded-card border border-border bg-surface px-6 py-7 shadow-card md:gap-6 md:px-10 md:py-9">
      <HeroCover plan={plan} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 eyebrow">{t('publicPlan.eyebrow')}</p>
        <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.02] font-extrabold tracking-[-0.025em] break-words">
          {storyAddress === null ? (
            plan.storyTitle
          ) : (
            <Link to={storyAddress} className="text-heading no-underline hover:underline">
              {plan.storyTitle}
            </Link>
          )}
        </h1>
        <p className="m-0 text-sm break-words text-body" data-testid="atlas-public-byline">
          {t('publicPlan.byline', { name: plan.writerName })}
        </p>
      </div>
    </header>
  );
}
