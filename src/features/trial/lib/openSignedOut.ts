/**
 * The pages a signed-out visitor can still open while the members_only flag is on (TRIAL-WALL;
 * Robert, 23 Nov 2026: "If I'm not logged in, I should only be able to see the main page where
 * it says get in").
 *
 * Who calls it: components/SignedOutGate.tsx.
 * Why these: the home page with "Get in"; signing in, signing up, invite links, the email
 * links' landing page and a new password, so a member can get in; the Legal centre, Contact us
 * and the public report form, the contact points the DSA asks to keep reachable (art. 11, 12
 * and 16), as the maintenance page and the computers-only gate keep them open; and the links a
 * person opens from an email without an account (unsubscribe, a parent's answer, a teacher's
 * school email, checking a certificate) and the "not open in your country" pages.
 * Read stays open as a shop window (Robert, 23 Nov 2026, 10:50 UTC: "we can have read ... similar
 * to how Facebook or Reddit have it. You can see a preview, but then you have to sign in or sign
 * up"): Discover and its lists, a story's page and a chapter, where get_chapter() sends a
 * signed-out visitor only the short preview and the sign-in prompt. Library, Together, search,
 * profiles and the rest stay closed.
 */
import { pathWithoutPlace } from '@/lib/websitePlace';

/** The start of every address that stays open to a signed-out visitor. */
const openPathPrefixes = [
  '/sign-in',
  '/sign-up',
  '/join',
  '/auth/',
  '/forgot-password',
  '/reset-password',
  '/legal',
  '/contact',
  '/report',
  '/unsubscribe',
  '/parent-consent',
  '/data-request/parent',
  '/teacher-check/confirm',
  '/verify',
  '/not-open',
  '/open-here',
  // Read: Discover, its See all lists, and a story's page and chapters (the preview only).
  '/discover',
  '/s/',
];

/**
 * Says whether a signed-out visitor may open this page while the site is for members only.
 *
 * @param pathname - the address's path, with or without its country and language
 * @returns true for the home page, the pages above and Read
 */
export function isOpenSignedOut(pathname: string): boolean {
  const pagePath = pathWithoutPlace(pathname);
  // The home page, at "/" or at its country and language ("/ro/ro").
  if (pagePath === '/') return true;
  return openPathPrefixes.some((prefix) => pagePath.startsWith(prefix));
}
