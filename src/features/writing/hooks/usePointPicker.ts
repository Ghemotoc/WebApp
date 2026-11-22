/**
 * usePointPicker: which point of the followers line shows its tooltip, and the keys that move it
 * (bundle CALM-7b; design handover Step 4, "Hover and keyboard").
 *
 * Left and Right move from point to point, Home and End jump to the first and the last, and
 * Escape hides the tooltip. From no point, Left starts at the newest and Right at the oldest.
 * Who uses it: FollowersLinePlot. It calls nothing outside React.
 */
import { useState, type KeyboardEvent } from 'react';

/**
 * The point a key moves to.
 *
 * @param key - the key pressed
 * @param current - the point showing now, or null
 * @param count - how many points there are
 * @returns the next point, null to hide, or undefined when the key isn't one of ours
 */
export function nextPointFor(
  key: string,
  current: number | null,
  count: number,
): number | null | undefined {
  const last = count - 1;
  if (key === 'Escape') return null;
  if (count === 0) return undefined;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  if (key === 'ArrowLeft') return current === null ? last : Math.max(0, current - 1);
  if (key === 'ArrowRight') return current === null ? 0 : Math.min(last, current + 1);
  return undefined;
}

/**
 * Keeps the chosen point and answers the plot's keys.
 *
 * @param count - how many points the line has
 * @returns the chosen point, a setter for the pointer and the key handler
 */
export function usePointPicker(count: number) {
  const [chosen, setChosen] = useState<number | null>(null);
  // A shorter line (a new range) may no longer have the chosen point.
  const shown = chosen !== null && chosen < count ? chosen : null;

  /** Moves the tooltip for the arrow keys, Home, End and Escape; other keys pass through. */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = nextPointFor(event.key, shown, count);
    if (next === undefined) return;
    event.preventDefault();
    setChosen(next);
  }

  return { chosen: shown, choose: setChosen, onKeyDown };
}
