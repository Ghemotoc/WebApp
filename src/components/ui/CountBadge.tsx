/**
 * CountBadge: the small number on a top-bar icon when something is new (design books item 16,
 * "Show what is inside"; Robert's decision card "Small number, 9+ cap", 24 Nov 2026, 05:17 UTC).
 *
 * It shows 1 to 9, then "9+", so it stays one small round shape and never grows into a pill. It is
 * drawn for the eye only (aria-hidden): the link that holds it says the full count in its name
 * ("Notifications, 3 new"), so a screen reader never meets a bare number.
 * Colours: the count-badge fill (`--gold`, a soft honey by day and white at night) with its text
 * colour (`--on-gold`), about 12:1 in both themes (tokens.css).
 * Who uses it: NotificationBell and MessagesHeaderLink. What it calls: formatBadgeCount (countBadgeText.ts).
 */
import { formatBadgeCount } from './countBadgeText';

/**
 * Renders the badge in the top right corner of a 44 px round icon link.
 *
 * @param count - how many new things there are
 * @returns the badge, or nothing when the count is 0
 */
export function CountBadge({ count }: { count: number }) {
  const text = formatBadgeCount(count);
  if (text === '') return null;
  return (
    <span
      aria-hidden="true"
      data-count-badge
      className="absolute top-1 right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 type-meta leading-none font-semibold text-on-gold tabular-nums"
    >
      {text}
    </span>
  );
}
