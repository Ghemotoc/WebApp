/**
 * useHomeAddress: where the logo and the Home link go (bundle G9 WRITING, part a; since user story
 * 1.1, 25 Nov 2026, "/" for everyone: the signed-in Home, board A01, lives at "/" and the Writers'
 * hub at /hub is a page of its own, board A03).
 *
 * Kept as the one place that says where Home is, so a later change is one line.
 * Who calls it: TopBar, PhoneHeader, NavTrack and Footer (src/app/shell/). What it calls: nothing.
 */

/**
 * Says where "home" is for the person looking.
 *
 * @returns "/": WebsiteHomePage shows the member's Home or the public home page there
 */
export function useHomeAddress(): '/' {
  return '/';
}
