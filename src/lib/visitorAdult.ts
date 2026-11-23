/**
 * The "I'm 18 or over" answer of a visitor who isn't logged in (bundle CALM-9m; Robert,
 * 23 Nov 2026, 09:04 UTC).
 *
 * Why: an 18+ story's page is open to everyone and indexable, but its chapter text waits until a
 * visitor says they are 18 or over and want to see it. The answer is kept only in this browser
 * (localStorage), never sent anywhere but in the X-Visitor-Adult header of the app's own requests,
 * where visitor_said_adult() reads it (supabase/migrations/…_calm9m_mature_visitor_confirm.sql).
 * The database ignores it for signed-in members: their own age decides (rating_allows()).
 * Who calls it: src/lib/supabase.ts (every request) and AdultQuestionNotice (the button).
 * What it calls next: localStorage only.
 */

/** Where the answer is kept in this browser; "yes" once given. */
export const VISITOR_ADULT_STORAGE_KEY = 'visitor-said-adult';

/**
 * Whether this browser's visitor already said they are 18 or over.
 *
 * @returns true once the answer was given here; false when not, or when storage can't be read
 *   (a private window that blocks it): the visitor is then simply asked again
 */
export function hasVisitorSaidAdult(): boolean {
  try {
    return localStorage.getItem(VISITOR_ADULT_STORAGE_KEY) === 'yes';
  } catch {
    // Storage blocked: treat it as not answered, so the text stays behind the question.
    return false;
  }
}

/**
 * Keeps the visitor's "I'm 18 or over" answer in this browser.
 *
 * @returns true when it was saved; false when storage is blocked, so the caller can say the
 *   answer lasts only until the page is closed
 */
export function rememberVisitorSaidAdult(): boolean {
  // Step 1: the answer for this page's requests, even when storage is blocked.
  answeredThisVisit = true;
  // Step 2: the answer for later visits, when the browser lets us keep it.
  try {
    localStorage.setItem(VISITOR_ADULT_STORAGE_KEY, 'yes');
    return true;
  } catch {
    return false;
  }
}

/** True once the visitor answered during this visit, for browsers that block storage. */
let answeredThisVisit = false;

/**
 * Sends a request with X-Visitor-Adult: yes when this visitor said they are 18 or over.
 *
 * @param input - the address or request, as fetch takes it
 * @param init - the request's options, as fetch takes them
 * @param send - the fetch to hand the request on to (the page-language one in supabase.ts)
 * @returns the response
 * Errors: rejects as fetch does when the network fails; each api/ file handles that.
 */
export function fetchWithVisitorAdult(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  send: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<Response> {
  // Step 1: no answer yet: the request goes as it is.
  if (!answeredThisVisit && !hasVisitorSaidAdult()) return send(input, init);
  // Step 2: the same request with the one header added.
  const headers = new Headers(init?.headers);
  headers.set('X-Visitor-Adult', 'yes');
  return send(input, { ...init, headers });
}

/** For unit tests only: forgets the answer given during this visit. */
export function resetVisitorAdultForTests(): void {
  answeredThisVisit = false;
}
