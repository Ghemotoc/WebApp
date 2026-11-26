/**
 * PublicPlanHero: the head of a story's public plan (story S1-E17-33; GAPS-4; redrawn as board
 * E35 in user stories bundle 6, story 6.16).
 *
 * For readers, the breadcrumb "<story> / The story's world" (the story a link back to its page);
 * then the story's cover, small, beside its title as the page's heading and "by <pen name> ·
 * shared by the writer", the name a link to the writer's profile (a classic's real author has
 * none). In the writer's preview the Story Atlas bar already says where the writer is, so the
 * breadcrumb stays out and the story may not be published yet.
 * The cover is decoration here (the title is beside it as text) and goes through StoryCoverArt,
 * so an uploaded picture shows only once its check has passed (CLAUDE.md rule 19).
 * Who uses it: PublicPlanPage and PlanPreviewPage. What it calls: StoryCoverArt, DrawnCover and
 * React i18next's Trans.
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { PublicPlan } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The cover's width beside the title: the board's 72 px (E35). */
const coverWidth = 'w-18';

/** The story's cover, small, beside the words. */
function HeroCover({ plan }: { plan: PublicPlan }) {
  const choice = resolveCoverChoice({
    id: plan.storyId,
    coverKind: plan.coverKind,
    drawnCover: plan.drawnCover,
    coverStyle: plan.coverStyle,
    titleFont: plan.titleFont,
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

/** "<story> / The story's world": where the reader is (board E35). */
function PlanBreadcrumb({ plan, storyAddress }: { plan: PublicPlan; storyAddress: string }) {
  const { t } = useAtlasTranslation();
  return (
    <nav aria-label={t('breadcrumb.label')} className="min-w-0">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-meta text-ink-muted">
        <li className="min-w-0">
          <Link
            to={storyAddress}
            className="wrap-anywhere text-ink-muted underline underline-offset-[3px]"
          >
            {plan.storyTitle}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-2">
          {/* The slash is a separator only, so screen readers skip it. */}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t('publicPlan.eyebrow')}</span>
        </li>
      </ol>
    </nav>
  );
}

/** "by <name> · shared by the writer", the name a link to the writer's profile when there is one. */
function Byline({ plan }: { plan: PublicPlan }) {
  const { t } = useAtlasTranslation();
  if (plan.writerHandle === null) return <>{t('publicPlan.byline', { name: plan.writerName })}</>;
  return (
    <Trans
      t={t}
      i18nKey="publicPlan.bylineLinked"
      values={{ name: plan.writerName }}
      components={{
        writer: <Link to={`/u/${plan.writerHandle}`} className="text-link underline" />,
      }}
    />
  );
}

/**
 * Renders the head.
 *
 * @param props.plan - the public plan (the story's title, cover and writer's name)
 * @param props.storyAddress - the story's public page, or null in the writer's preview
 * @returns the breadcrumb (readers only), the cover, the title and the byline
 */
export function PublicPlanHero({
  plan,
  storyAddress,
}: {
  plan: PublicPlan;
  storyAddress: string | null;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-4">
      {storyAddress !== null && <PlanBreadcrumb plan={plan} storyAddress={storyAddress} />}
      <div className="flex min-w-0 items-center gap-4">
        <HeroCover plan={plan} />
        <div className="flex min-w-0 flex-col">
          <h1 className="m-0 type-title break-words text-ink-heading lg:type-display">
            {plan.storyTitle}
          </h1>
          <p className="m-0 type-meta break-words text-ink-muted" data-testid="atlas-public-byline">
            <Byline plan={plan} />
          </p>
        </div>
      </div>
    </header>
  );
}
