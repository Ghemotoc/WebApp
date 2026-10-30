/**
 * useSeasonalDoodle: the seasonal doodle Discover or Search shows today (story S1-E5-07).
 *
 * Who calls it: components/SeasonalDoodle.tsx.
 * What it calls: fetchSeasonalDoodle() with the reader's own date (S1-E5-07: the device's date,
 * never a location). It asks again every minute, so a change staff make in the schedule shows
 * within a minute with no release (S1-E5-07 criterion 3). If the read fails, no doodle shows:
 * it is decoration, so nothing else on the page waits for it.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchSeasonalDoodle, type SeasonalPlace } from '../api/seasonalStore';
import { localDateOf, type SeasonalDoodleName } from '../lib/seasonalCalendar';

/** How often the doodle is read again: within a minute of a change (S1-E5-07 criterion 3). */
const refreshEveryMs = 60_000;

/**
 * Reads today's doodle for one place.
 *
 * @param place - Discover or Search
 * @returns the doodle, or null while it loads, when the read fails or when nothing covers today
 */
export function useSeasonalDoodle(place: SeasonalPlace): SeasonalDoodleName | null {
  const today = localDateOf();
  const { data } = useQuery({
    queryKey: ['seasonal-doodle', place, today],
    queryFn: async () => {
      // No database (a build without Supabase settings): no doodle.
      const client = await getSupabaseClient();
      if (client === null) return null;
      return fetchSeasonalDoodle(client, today, place);
    },
    staleTime: refreshEveryMs,
    refetchInterval: refreshEveryMs,
    retry: false,
  });
  return data ?? null;
}
