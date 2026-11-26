/**
 * pathAfterSignUp: the page a new member opens once they finish setting up, when sign-up was
 * started from another page (BOOKS-A10, user story 1.10: "Join for free opens Sign up with the
 * campaign remembered, so the member lands in writing month after joining").
 *
 * Who calls it: SignUpPage remembers `?next=` from its address (a landing page's "Join for free"
 * links to /sign-up?next=/hub); OnboardingSteps opens it when setup is done, instead of Discover.
 * Why it is kept in the browser: the sign-up link arrives by email and may open in a new tab, so
 * the address's `next` is gone by then; the same browser still has it. It is only a page path on
 * this site (pathAfterSignIn refuses anything else, so no open redirect), never personal data.
 * Every read and write is wrapped, because storage can be blocked (a private window).
 */
import { pathAfterSignIn } from './nextPath';

/** Where the path is kept until setup is done. */
export const PATH_AFTER_SIGN_UP_KEY = 'path-after-sign-up';

/**
 * Remembers the page to open after setup, when the address names a safe one.
 *
 * @param next - the `next` value from the sign-up address, or null
 */
export function rememberPathAfterSignUp(next: string | null): void {
  // Step 1: nothing to remember, or a value that isn't a page here ("/" is the safe fallback).
  if (next === null) return;
  const safePath = pathAfterSignIn(next);
  if (safePath === '/') return;
  // Step 2: keep it; when storage is blocked the new member simply lands on Discover.
  try {
    localStorage.setItem(PATH_AFTER_SIGN_UP_KEY, safePath);
  } catch {
    // Storage blocked: nothing to keep, and nothing the person needs to know.
  }
}

/**
 * Takes the remembered page, once: it is forgotten as it is read.
 *
 * @param fallback - where to go when nothing was remembered ("/discover")
 * @returns the remembered page, checked again, or the fallback
 */
export function takePathAfterSignUp(fallback: string): string {
  try {
    const remembered = localStorage.getItem(PATH_AFTER_SIGN_UP_KEY);
    localStorage.removeItem(PATH_AFTER_SIGN_UP_KEY);
    if (remembered === null) return fallback;
    const safePath = pathAfterSignIn(remembered);
    return safePath === '/' ? fallback : safePath;
  } catch {
    return fallback;
  }
}
