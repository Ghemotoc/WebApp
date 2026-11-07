/**
 * Reads the admin front page's numbers at a glance (bundle DASH-1; Robert, 6 Nov 2026, 18:32 UTC:
 * "There's not like a real dashboard where I can see things at a glance").
 *
 * Who calls it: hooks/useStaffDashboard.ts, for StaffDashboardTiles on StaffHomePage.
 * What it calls next: staff_dashboard() (…_dash1_01_staff_dashboard.sql), which answers only a
 * live staff session and leaves out every area the person may not open, so a support person never
 * learns how many reports wait for moderators. Counts only: no name, email or text comes back.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { numberOrNull, objectOf } from './marchNumbers';

/** One number on the front page, and the page it opens. */
export interface DashboardTile {
  /** A stable name for the tile, for example "moderation.overdue" (also the locale key). */
  key: string;
  /** How many. */
  count: number;
  /** The staff page that lists them. */
  href: string;
  /** True when a number above zero needs someone today: something past its deadline, or failing. */
  isWarning: boolean;
}

/** Where each number sits in the answer and which page lists it, in the order the tiles show. */
interface TileSource {
  section: string;
  field: string;
  href: string;
  warnsAboveZero: boolean;
}

/**
 * The tiles, grouped as the side menu is: Safety, People, then System (DASH-1). Each `section`
 * and `field` matches a key that staff_dashboard() builds.
 */
const tileSources: TileSource[] = [
  { section: 'moderation', field: 'waiting', href: '/staff/moderation', warnsAboveZero: false },
  { section: 'moderation', field: 'overdue', href: '/staff/moderation', warnsAboveZero: true },
  { section: 'moderation', field: 'pictures', href: '/staff/pictures', warnsAboveZero: false },
  { section: 'appeals', field: 'open', href: '/staff/appeals', warnsAboveZero: false },
  {
    section: 'schools',
    field: 'teacherChecks',
    href: '/staff/schools/teachers',
    warnsAboveZero: false,
  },
  { section: 'dataRequests', field: 'open', href: '/staff/data-requests', warnsAboveZero: false },
  { section: 'dataRequests', field: 'overdue', href: '/staff/data-requests', warnsAboveZero: true },
  { section: 'supportTickets', field: 'open', href: '/staff/support', warnsAboveZero: false },
  { section: 'metrics', field: 'signUpsThisWeek', href: '/staff/metrics', warnsAboveZero: false },
  { section: 'logs', field: 'failedCalls', href: '/staff/logs', warnsAboveZero: true },
  { section: 'logs', field: 'crashes', href: '/staff/logs', warnsAboveZero: true },
];

/**
 * Turns staff_dashboard()'s answer into tiles.
 *
 * @param answer - the JSON the database returned
 * @returns one tile per number the answer holds, in tile order; a number the answer leaves out
 *   (an area the person may not open) gets no tile
 */
export function dashboardTilesFromAnswer(answer: Json): DashboardTile[] {
  const sections = objectOf(answer);
  const tiles: DashboardTile[] = [];
  for (const source of tileSources) {
    // Step 1: find the number; a missing area or a value that isn't a number is skipped.
    const count = numberOrNull(objectOf(sections[source.section])[source.field]);
    if (count === null) continue;
    // Step 2: mark what needs someone today, so it stands out on the page.
    tiles.push({
      key: `${source.section}.${source.field}`,
      count,
      href: source.href,
      isWarning: source.warnsAboveZero && count > 0,
    });
  }
  return tiles;
}

/**
 * Reads the numbers.
 *
 * @param client - the shared Supabase client
 * @returns the tiles the person may see
 * Errors: throws when the database refuses (outside a staff session) or can't be reached.
 */
export async function fetchStaffDashboard(client: AppSupabaseClient): Promise<DashboardTile[]> {
  const result = await client.rpc('staff_dashboard');
  if (result.error !== null) throw new Error(result.error.message);
  return dashboardTilesFromAnswer(result.data);
}
