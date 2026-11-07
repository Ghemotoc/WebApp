/**
 * nextPath: where the log-in page goes after a successful log-in (bundle DASH-1).
 *
 * Who calls it: SignInPage, with the `next` value of its address, for example
 * /sign-in?next=/staff from the admin site's "Your staff session has ended" page.
 * Why it checks: the address can be written by anyone, so an unchecked value could send a person
 * who just logged in to another website (an "open redirect", OWASP ASVS 5.1.5). Only a path on
 * this site is accepted; everything else goes to the home page, as before DASH-1.
 */

/** Where a log-in goes when the address names no safe page. */
const homePath = '/';

/**
 * Picks the page to open after logging in.
 *
 * @param next - the `next` value from the log-in page's address, or null when there is none
 * @returns that path when it is a page on this site ("/staff", "/write?tab=drafts"); otherwise "/"
 */
export function pathAfterSignIn(next: string | null): string {
  // Step 1: no value, or one that isn't a path on this site, goes home.
  if (next === null || !next.startsWith('/')) return homePath;
  // Step 2: "//other.example" and "/\other.example" are read by browsers as another website.
  if (next.startsWith('//') || next.startsWith('/\\')) return homePath;
  // Step 3: control characters (a tab or a line break) can hide either trick, so refuse them too.
  if (hasControlCharacter(next)) return homePath;
  return next;
}

/**
 * Whether a text holds a control character (codes 0 to 31, and 127).
 *
 * @param text - the text to look through
 * @returns true when one is there
 */
function hasControlCharacter(text: string): boolean {
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) return true;
  }
  return false;
}
