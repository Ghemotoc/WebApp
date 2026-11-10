/**
 * PublicPlanHero: the band at the top of a story's public plan (story S1-E17-33; bundle G10
 * ATLAS, part c4, boards AtlasPreview, AtlasPreviewArea and AtlasPreviewCharacter).
 *
 * The eyebrow "The story's world", the story's title as the page's heading and a line saying the
 * writer shared it. For readers the title is a link back to the story's page; in the writer's
 * preview it is plain words, since the story may not be published yet.
 * Who uses it: PublicPlanPage and PlanPreviewPage. What it calls: nothing of ours.
 */
import { Link } from 'react-router';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the band.
 *
 * @param props.title - the story's title
 * @param props.storyAddress - the story's public page, or null for plain words (the preview)
 * @returns the header
 */
export function PublicPlanHero({
  title,
  storyAddress,
}: {
  title: string;
  storyAddress: string | null;
}) {
  const { t } = useAtlasTranslation();
  return (
    <header className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-6 py-7 shadow-card md:px-10 md:py-9">
      <p className="m-0 eyebrow">{t('publicPlan.eyebrow')}</p>
      <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.02] font-extrabold tracking-[-0.025em] break-words">
        {storyAddress === null ? (
          title
        ) : (
          <Link to={storyAddress} className="text-heading no-underline hover:underline">
            {title}
          </Link>
        )}
      </h1>
      <p className="m-0 text-sm text-body">{t('publicPlan.sharedByWriter')}</p>
    </header>
  );
}
