/**
 * PublicPlanNav: the row of a story's public areas on the readers' pages (story S1-E17-33:
 * "tabs or links for those areas show … and none for areas that are off").
 *
 * Real links inside one glass track (boards AtlasPreview*, G10c4), with aria-current on the open
 * one, filled so it isn't told by colour alone; the track wraps on a phone. Who uses it: PublicPlanView. What it calls: lib/publicPlanAreas.ts.
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
    <nav aria-label={t('publicPlan.navLabel')}>
      <ul className="m-0 inline-flex max-w-full list-none flex-wrap gap-1 rounded-[24px] border border-border bg-surface p-1.5 shadow-card">
        {areas.map((area) => (
          <li key={area}>
            <Link
              to={`${base}/${areaPaths[area]}`}
              aria-current={area === current ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold no-underline',
                area === current ? 'bg-primary text-on-primary' : 'text-heading hover:bg-tint',
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
