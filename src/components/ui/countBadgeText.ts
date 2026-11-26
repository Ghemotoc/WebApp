/**
 * countBadgeText: the words on a CountBadge (design books item 16; Robert's decision card
 * "Small number, 9+ cap", 24 Nov 2026, 05:17 UTC). Kept apart from the component so the
 * component file exports only a component (React fast refresh).
 * Who uses it: CountBadge, NotificationBell and MessagesHeaderLink (badgeLinkName), and their
 * tests. What it calls: nothing.
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

/** The locale keys of a badged link's name: nothing new, a number up to 9, and above 9. */
export interface BadgeLinkNameKeys {
  none: string;
  some: string;
  many: string;
}

/**
 * The accessible name of a top-bar link that carries a CountBadge, so the name always holds what
 * the badge shows (WCAG 2.5.3, label in name): "Notifications, 3 new", and "Notifications, 9+
 * new" once the badge says "9+" (axe's label-content-name-mismatch otherwise).
 *
 * @param t - a translation function
 * @param keys - the three locale keys; `some` is plural on {{count}}, `many` says {{number}}
 * @param count - how many new things there are
 * @returns the link's name
 */
export function badgeLinkName(
  t: (key: string, values?: Record<string, unknown>) => string,
  keys: BadgeLinkNameKeys,
  count: number,
): string {
  const shown = formatBadgeCount(count);
  // Step 1: no badge, the plain name.
  if (shown === '') return t(keys.none);
  // Step 2: a capped badge says "9+", and so does the name.
  if (count > BADGE_COUNT_CAP) return t(keys.many, { number: shown });
  return t(keys.some, { count: Math.floor(count) });
}
