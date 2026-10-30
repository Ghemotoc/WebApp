/**
 * SeasonalDoodle: the doodle that changes with the seasons and special days, beside the Discover
 * greeting and Search's popular tags (story S1-E5-07; board Discover 3.1).
 *
 * Decorative only (DoD design rules): a widget doodle that travels with its heading, hidden from
 * screen readers, taking no clicks, never moving or animating, and never over text. While it loads
 * or when nothing covers today, it draws nothing, so the heading never jumps for it.
 * Who shows it: DiscoverPage (place "discover"); Search will show it with place "search".
 * What it calls: useSeasonalDoodle() and the shared Doodle.
 */
import { Doodle } from '@/components/ui/Doodle';

import type { SeasonalPlace } from '../api/seasonalStore';
import { useSeasonalDoodle } from '../hooks/useSeasonalDoodle';
import { seasonalDoodleFiles } from '../lib/seasonalCalendar';

/** What the doodle needs. */
interface SeasonalDoodleProps {
  place: SeasonalPlace;
  /** The component it belongs to (data-doodle-on). */
  on: string;
  /** Size and placement, for example "w-16 rotate-6". */
  className?: string;
}

/**
 * Renders today's doodle.
 *
 * @returns the doodle, or nothing
 */
export function SeasonalDoodle({ place, on, className }: SeasonalDoodleProps) {
  const doodle = useSeasonalDoodle(place);
  if (doodle === null) return null;
  return (
    <Doodle
      name={seasonalDoodleFiles[doodle]}
      kind="widget"
      on={on}
      hideBelow="always"
      className={className}
    />
  );
}
