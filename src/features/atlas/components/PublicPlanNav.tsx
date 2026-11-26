/**
 * PublicPlanNav: the row of a story's public areas on the readers' pages (story S1-E17-33:
 * "tabs or links for those areas show … and none for areas that are off").
 *
 * Real links inside one tinted track (board E35, user stories bundle 6, story 6.16), with
 * aria-current on the open one, raised on the box surface so it isn't told by colour alone; on a
 * narrow screen the track scrolls sideways rather than wrapping. Who uses it: PublicPlanView.
 * What it calls: lib/publicPlanAreas.ts.
 */
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { PlanArea } from '../api/publicPlan';
import { areaPaths } from '../lib/publicPlanAreas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the links.
 *
 * @param props.base - the base address (the readers' or the preview's)
 * @param props.areas - the public areas, in order
 * @param props.current - the area open now
 * @returns the navigation row
 */
export function PublicPlanNav({
  base,
  areas,
  current,
}: {
  base: string;
  areas: PlanArea[];
  current: PlanArea;
}) {
  const { t } = useAtlasTranslation();
  return (
    <nav aria-label={t('publicPlan.navLabel')} className="max-w-full overflow-x-auto">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-tint p-1">
        {areas.map((area) => (
          <li key={area}>
            <Link
              to={`${base}/${areaPaths[area]}`}
              aria-current={area === current ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-10 items-center rounded-full px-4 type-body font-semibold whitespace-nowrap no-underline',
                area === current
                  ? 'bg-surface text-ink-heading shadow-card'
                  : 'text-ink hover:text-ink-heading',
              )}
            >
              {t(`publicPlan.areas.${area}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
