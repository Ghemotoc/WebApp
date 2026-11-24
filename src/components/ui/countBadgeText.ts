/**
 * countBadgeText: the words on a CountBadge (design books item 16; Robert's decision card
 * "Small number, 9+ cap", 24 Nov 2026, 05:17 UTC). Kept apart from the component so the
 * component file exports only a component (React fast refresh).
 * Who uses it: CountBadge and its tests. What it calls: nothing.
 */

/** The biggest number the badge spells out; anything above shows as "9+". */
export const BADGE_COUNT_CAP = 9;

/**
 * The text on the badge for a count.
 *
 * @param count - how many new things there are (0 or more)
 * @returns "" for none, the number up to 9, else "9+"
 */
export function formatBadgeCount(count: number): string {
  // Step 1: nothing new, or a count that isn't a real number, draws no badge.
  if (!Number.isFinite(count) || count < 1) return '';
  // Step 2: above the cap the badge says "9+", so it keeps its size.
  if (count > BADGE_COUNT_CAP) return `${BADGE_COUNT_CAP}+`;
  return String(Math.floor(count));
}
