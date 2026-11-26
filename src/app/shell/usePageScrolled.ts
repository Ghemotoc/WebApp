/**
 * usePageScrolled: tells the top bar whether the page has scrolled under it (bundle GLASS-3;
 * Robert, 11 Nov 2026: "When the pages aren't scrolled, it's a bit bigger and more transparent,
 * and then when you scroll down, it becomes tighter and more opaque", as on the main website).
 *
 * The main website (engage-grow-hub, src/features/site/Navbar.tsx) switches at 12 px, so the bar
 * goes back to its roomy self at 12 px too. It tightens a little later, once the page has scrolled
 * 12 px plus the 14 px the bar loses when it tightens (bundle 5, board D05): the bar is in the
 * page's flow, so tightening moves the page up 14 px and the browser scrolls back 14 px to keep the
 * text in view (scroll anchoring). With one number for both, a page resting just past 12 px was
 * taken back under 12 px, the bar grew, the page scrolled forward again, and so on every frame:
 * the page shook and a test could not click a button that never held still (CI, PR #652). With
 * the two numbers 14 px apart, the scroll back always lands where the bar stays as it is.
 * The scroll listener is passive and only sets state when the answer changes, so a scroll costs
 * nothing more than one comparison.
 * Who uses it: TopBar. What it calls: the window's scroll position.
 */
import { useEffect, useState } from 'react';

/** At or under this scroll position, in pixels, the bar is roomy (the main website's number). */
export const scrolledThreshold = 12;

/** How much shorter the tight bar is, in pixels: 6 px less above the pill, 8 px less inside it. */
export const tightBarShrink = 14;

/**
 * Says whether the bar should be tight, given where the page is and how the bar is now.
 *
 * @param scrollY - the window's scroll position, in pixels
 * @param isTightNow - whether the bar is tight at the moment
 * @returns true when the bar should be tight
 */
export function shouldBeTight(scrollY: number, isTightNow: boolean): boolean {
  // A tight bar stays tight until the page is back at 12 px or less.
  if (isTightNow) return scrollY > scrolledThreshold;
  // A roomy bar tightens only past 26 px, so the 14 px the browser scrolls back keep it tight.
  return scrollY > scrolledThreshold + tightBarShrink;
}

/**
 * Follows the window's scroll position.
 *
 * @returns true once the page has scrolled under the bar (see shouldBeTight)
 */
export function usePageScrolled(): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Step 1: read the position now, so a page opened half-way down starts with the tight bar.
    const read = () => setIsScrolled((isTightNow) => shouldBeTight(window.scrollY, isTightNow));
    read();
    // Step 2: read it again on every scroll; React skips the render when the answer is the same.
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);

  return isScrolled;
}
