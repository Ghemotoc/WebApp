/**
 * viewerCountry: the signed country of this connection, sent to the database with every request
 * so a story hidden in the reader's country stays hidden (bundle COUNTRY-1; Robert, 21 Nov 2026).
 *
 * How it works: our Cloudflare Pages Function /api/signup-context reads the country Cloudflare
 * found for the connection and signs it (server/signup-context.ts, S1-E2-10). This file asks for
 * that token when the Supabase client is first made, again every 20 minutes and when the tab
 * comes back after a while, and hands it to fetchWithViewerCountry(), which adds it to each request
 * as the X-Viewer-Country header. The database checks the signature and the age (at most an hour)
 * in viewer_country() (supabase/migrations/…_country1_hide_in_countries.sql).
 * Why a header and not the profile: board D07 says "A reader's connection decides it", so a member
 * travelling into a country stops seeing stories hidden there, and one travelling out sees them.
 * It works as a block, not a lock: a VPN gets around it, which the board accepts.
 * Privacy: the token holds a country code and a time only; it is kept in memory, never stored.
 * Who calls it: src/lib/supabase.ts (startViewerCountry when the client is made, and the fetch).
 * What it calls next: /api/signup-context through fetchSignupCountry().
 */
import { fetchSignupCountry } from '@/features/auth/api/signupContext';

/** How often a new token is asked for; the database accepts one for an hour. */
const refreshAfterMilliseconds = 20 * 60 * 1000;

/** How long a request may wait for the first token before it goes without (the first paint). */
const firstTokenWaitMilliseconds = 400;

/** The token now, or null when there is none (unknown country, or the function unreachable). */
let currentToken: string | null = null;

/** When the token was last asked for (milliseconds), or 0 before the first ask. */
let askedAt = 0;

/** The ask in flight, so requests can wait a moment for the very first token. */
let pendingAsk: Promise<void> | null = null;

/**
 * Asks the Pages Function for a fresh token and keeps it.
 *
 * @returns once the answer is in (a failed ask keeps the token there was)
 * Errors: none; fetchSignupCountry() answers nulls when the function can't be reached.
 */
function askForToken(): Promise<void> {
  // Step 1: one ask at a time.
  if (pendingAsk !== null) return pendingAsk;
  askedAt = Date.now();
  // Step 2: keep the new token; a null answer means the country isn't known right now.
  pendingAsk = fetchSignupCountry()
    .then((context) => {
      currentToken = context.token;
    })
    .finally(() => {
      pendingAsk = null;
    });
  return pendingAsk;
}

/**
 * Asks again when the last ask is older than the refresh time.
 *
 * @returns nothing
 */
function refreshWhenStale(): void {
  if (Date.now() - askedAt >= refreshAfterMilliseconds) void askForToken();
}

/**
 * Starts keeping the token: the first ask now, then every 20 minutes and when the tab is shown
 * again. Safe to call more than once.
 *
 * @returns nothing
 * Errors: none.
 */
export function startViewerCountry(): void {
  // Step 1: only once, and only in a browser (unit tests and the server have no window).
  if (askedAt !== 0 || typeof window === 'undefined') return;
  void askForToken();
  // Step 2: keep it fresh while the page is open, and after the laptop wakes up.
  window.setInterval(refreshWhenStale, refreshAfterMilliseconds);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshWhenStale();
  });
}

/**
 * The token to send: the current one, or, while the very first ask is in flight, that one if it
 * arrives within 400 ms (so the first page asks with the right country without waiting long).
 *
 * @returns the token, or null
 */
export async function viewerCountryToken(): Promise<string | null> {
  if (currentToken === null && pendingAsk !== null) {
    const shortWait = new Promise<void>((resolve) => {
      setTimeout(resolve, firstTokenWaitMilliseconds);
    });
    await Promise.race([pendingAsk, shortWait]);
  }
  return currentToken;
}

/**
 * Sends a request with the connection's signed country in the X-Viewer-Country header.
 *
 * @param input - the address or request, as fetch takes it
 * @param init - the request's options, as fetch takes them
 * @param send - the fetch to hand the request on to (the page-language one in supabase.ts)
 * @returns the response
 * Errors: rejects as fetch does when the network fails; each api/ file handles that.
 */
export async function fetchWithViewerCountry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  send: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<Response> {
  // Step 1: without a token the request goes as it is; the database then uses the profile.
  const token = await viewerCountryToken();
  if (token === null) return send(input, init);
  // Step 2: the same request with the one header added.
  const headers = new Headers(init?.headers);
  headers.set('X-Viewer-Country', token);
  return send(input, { ...init, headers });
}

/** For unit tests only: forgets the token and the timers' state. */
export function resetViewerCountryForTests(token: string | null = null): void {
  currentToken = token;
  askedAt = token === null ? 0 : Date.now();
  pendingAsk = null;
}
