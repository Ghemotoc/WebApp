/**
 * useShowAfter: says whether a wait has lasted long enough to show a placeholder (design books
 * item 15, "Loading that looks like the page").
 *
 * Why 300 ms: most reads answer sooner, and a grey shape that flashes for a moment looks like a
 * glitch; after 300 ms the wait is long enough that the page should show what is coming (Tidwell,
 * Designing Interfaces; Saffer, Microinteractions).
 * Who uses it: PlaceholderShelf and PlaceholderComments (src/components/ui/).
 */
import { useEffect, useState } from 'react';

/** How long a wait lasts before the placeholder shows (design books item 15). */
export const PLACEHOLDER_DELAY_MS = 300;

/**
 * Becomes true once `delayMs` has passed since the component appeared.
 *
 * @param delayMs - how long to wait; 300 ms unless a test says otherwise
 * @returns false at first, true after the delay
 */
export function useShowAfter(delayMs: number = PLACEHOLDER_DELAY_MS): boolean {
  const [isShown, setIsShown] = useState(false);
  useEffect(() => {
    // The timer is cleared if the real content arrives first and this unmounts.
    const timer = window.setTimeout(() => setIsShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return isShown;
}
