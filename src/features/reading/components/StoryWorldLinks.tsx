/**
 * StoryWorldLinks: "The story's world" on a story's page, a link to each part of the plan its
 * writer shares (story S1-E17-33: "when I open the story page, then tabs or links for those
 * areas show … and none for areas that are off").
 *
 * Nothing shows while nothing is shared, or for a reader the story's rules keep out (the
 * database answers the same for both). Since CALM-7c (board New-Story): the line "The story's
 * world", the heading "Shared by the writer" and the links as quiet buttons in one wrapping row.
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
    <section aria-labelledby="story-world-name" className="flex flex-col gap-2">
      {/* Board New-Story: the meta line "The story's world" over the heading, no eyebrow. It
          also names the region, so screen readers keep hearing "The story's world". */}
      <p id="story-world-name" className="m-0 type-meta leading-[18px] text-ink-muted">
        {t('storyPage.world.heading')}
      </p>
      <h2 id="story-world-heading" className="m-0 type-heading text-ink-heading">
        {t('storyPage.world.sharedHeading')}
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0 pt-2">
        {plan.areas.map((area) => (
          <li key={area}>
            <Link
              to={`${readerPlanBase(plan.storySlug)}/${areaPaths[area]}`}
              className="inline-flex h-11 items-center rounded-full button-glass px-4 type-body font-semibold no-underline"
            >
              {t(`storyPage.world.areas.${area}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
