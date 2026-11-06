/**
 * useFeaturedRotation: which Featured story shows, and the band's turning by itself (story
 * S1-E5-10; board Discover: "slides itself every 7 seconds, pausable, arrows and dots work").
 *
 * The band turns to the next story every 7 seconds, but never when:
 * - the reader prefers reduced motion (it starts paused; WCAG 2.2.2 and 2.3.3);
 * - the reader paused it with the button;
 * - the keyboard focus or the pointer is inside the band (so it doesn't move while being read).
 * Who calls it: components/FeaturedBand.tsx. What it calls: the browser's matchMedia and timers.
 */
import { useCallback, useEffect, useState } from 'react';

/** How long each story stays before the next (board: 7 seconds). */
const turnEveryMs = 7000;

/**
 * True when the reader asked their system for less motion.
 *
 * @returns whether to start paused
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Follows the current story and the pause states.
 *
 * @param count - how many stories the band holds
 * @returns index, isPaused (by the button), isTurning (moving by itself now), goTo, next,
 *   previous, togglePause and setIsHeld (focus or pointer inside)
 */
export function useFeaturedRotation(count: number) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(prefersReducedMotion);
  const [isHeld, setIsHeld] = useState(false);
  const isTurning = count > 1 && !isPaused && !isHeld;

  // Step 1: the timer runs only while the band may turn by itself.
  useEffect(() => {
    if (!isTurning) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, turnEveryMs);
    return () => window.clearInterval(timer);
  }, [isTurning, count]);

  // Step 2: the buttons; going past either end wraps round.
  const goTo = useCallback(
    (target: number) => setIndex(((target % count) + count) % count),
    [count],
  );
  const next = useCallback(() => setIndex((current) => (current + 1) % count), [count]);
  const previous = useCallback(() => setIndex((current) => (current - 1 + count) % count), [count]);
  const togglePause = useCallback(() => setIsPaused((paused) => !paused), []);

  // Step 3: a shorter list (a pick taken out) never leaves the index past its end.
  const shownIndex = count === 0 ? 0 : index % count;
  return { index: shownIndex, isPaused, isTurning, goTo, next, previous, togglePause, setIsHeld };
}
