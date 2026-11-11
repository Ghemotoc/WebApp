/**
 * usePageScrolled: tells the top bar whether the page has scrolled under it (bundle GLASS-3;
 * Robert, 11 Nov 2026: "When the pages aren't scrolled, it's a bit bigger and more transparent,
 * and then when you scroll down, it becomes tighter and more opaque", as on the main website).
 *
 * The main website (engage-grow-hub, src/features/site/Navbar.tsx) switches at 12 px, so this
 * does too. The scroll listener is passive and only sets state when the answer changes, so a
 * scroll costs nothing more than one comparison.
 * Who uses it: TopBar. What it calls: the window's scroll position.
 */
import { useEffect, useState } from 'react';

/** How far the page scrolls before the bar tightens, in pixels (the main website's number). */
export const scrolledThreshold = 12;

/**
 * Follows the window's scroll position.
 *
 * @returns true once the page has scrolled more than 12 px
 */
export function usePageScrolled(): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Step 1: read the position now, so a page opened half-way down starts with the tight bar.
    const read = () => setIsScrolled(window.scrollY > scrolledThreshold);
    read();
    // Step 2: read it again on every scroll; React skips the render when the answer is the same.
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);

  return isScrolled;
}
