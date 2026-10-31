/**
 * StoryWorldLinks: "The story's world" on a story's page, a link to each part of the plan its
 * writer shares (story S1-E17-33: "when I open the story page, then tabs or links for those
 * areas show … and none for areas that are off").
 *
 * Nothing shows while nothing is shared, or for a reader the story's rules keep out (the
 * database answers the same for both). The links are pills in one wrapping row; no doodles.
 * Texts live in reading.json, so the story page doesn't load all of Story Atlas's texts.
 * Who uses it: StoryPage. What it calls: usePublicPlan (get_public_story_plan()) and
 * lib/publicPlanAreas.ts from src/features/atlas.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { usePublicPlan } from '@/features/atlas/hooks/usePublicPlan';
import { areaPaths, readerPlanBase } from '@/features/atlas/lib/publicPlanAreas';

/**
 * Renders the links, or nothing.
 *
 * @param props.storySlug - the story's address
 * @returns the section, or null while nothing is shared
 */
export function StoryWorldLinks({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('reading');
  const { plan } = usePublicPlan(storySlug);
  if (!plan || plan.areas.length === 0) return null;
  return (
    <section aria-labelledby="story-world-heading" className="flex flex-col gap-3">
      <h2 id="story-world-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('storyPage.world.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('storyPage.world.hint')}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {plan.areas.map((area) => (
          <li key={area}>
            <Link
              to={`${readerPlanBase(plan.storySlug)}/${areaPaths[area]}`}
              className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
            >
              {t(`storyPage.world.areas.${area}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
