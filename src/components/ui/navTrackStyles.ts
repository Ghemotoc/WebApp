/**
 * navTrackStyles: the look of one link in the website top bar's recessed track (bundle G4 SHELL;
 * handoff "Navigation": recessed track, water bubble on the current page).
 *
 * The current page's link sits on the white water bubble (NavTrack measures and moves it) in bold,
 * so the page shows by shape and weight, not colour alone (WCAG 1.4.1); aria-current="page" says it
 * to screen readers. Every link is at least 40 px tall inside the 48 px track and 44 px wide or more.
 * Hovering or focusing a link shows the website's raised glass pill under it (GLASS-3, index.css).
 * Who uses it: NavTrack (src/app/shell/) and MessagesNavLink, which adds Messages while signed in.
 */

/**
 * The classes for a link in the track.
 *
 * @param isActive - true for the page on screen
 * @returns the link's classes
 */
export function navTrackLinkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'nav-track-link relative z-[1] inline-flex min-h-10 min-w-11 items-center justify-center gap-2 rounded-full border border-transparent px-4 text-sm whitespace-nowrap text-ink no-underline hover:text-heading';
  return isActive ? `${shared} font-bold` : `${shared} font-medium`;
}
