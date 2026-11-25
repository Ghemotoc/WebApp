/**
 * readerFirst: while a chapter's first paragraph is on its way, the app's other database requests
 * wait, so the chapter is drawn first (the reader speed check, 25 Nov 2026; S1-E4-01's criterion
 * "readable within 2 seconds on a mid-range phone on 4G").
 *
 * Why: on a cold load the app shell asks about fifteen questions of its own (the account's
 * status, names, settings, the interface text, the languages). Their answers came back just as
 * the chapter did, and each one redrew part of the page, so on a phone with the CPU four times
 * slower the chapter's first paragraph waited about 0.4 s longer. Holding them until that
 * paragraph is painted puts the chapter first; they follow a moment later.
 * How:
 * - The reader's route loader calls holdForReader() as it starts reading the chapter.
 * - Every request through the shared Supabase client calls waitForReaderTurn() first. The
 *   chapter itself (get_chapter) and sign-in requests (auth) never wait.
 * - The reader calls releaseForReader() once its first paragraph is painted, or once it knows
 *   there is no text to show (an error, a notice, a teaser). The hold also ends by itself after
 *   HOLD_LIMIT_MILLISECONDS, so nothing can wait for good.
 * Who calls it: src/app/router.tsx (through chapterPrefetch.ts), src/lib/supabase.ts and the
 * chapter reader (ChapterReaderPage, ChapterReading).
 * What it calls: nothing; it is a small promise and a timer.
 */

/** The longest the other requests wait, from the hold's start: a safety net, never the rule. */
export const HOLD_LIMIT_MILLISECONDS = 1500;

/** The requests that never wait: the chapter itself, and signing in or refreshing the session. */
const readerRequestPattern = /\/rpc\/get_chapter(?:\?|$)|\/auth\/v1\//;

/** The open hold, or null when nothing waits. */
let hold: { opened: Promise<void>; open: () => void; timer: ReturnType<typeof setTimeout> } | null =
  null;

/**
 * Starts holding the app's other requests until the reader's first paragraph is painted.
 * Calling it again while a hold is open changes nothing.
 */
export function holdForReader(): void {
  // Step 1: one hold at a time.
  if (hold !== null) return;
  // Step 2: a promise the waiting requests share, opened by releaseForReader() or the timer.
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  const timer = setTimeout(releaseForReader, HOLD_LIMIT_MILLISECONDS);
  hold = { opened, open, timer };
}

/** Lets every waiting request go, and the ones after them straight through. */
export function releaseForReader(): void {
  if (hold === null) return;
  clearTimeout(hold.timer);
  hold.open();
  hold = null;
}

/**
 * Waits, when a hold is open, until the reader's first paragraph is painted; at once otherwise.
 *
 * @param address - the request's address
 * @returns a promise that settles when the request may go
 */
export function waitForReaderTurn(address: string): Promise<void> {
  if (hold === null || readerRequestPattern.test(address)) return Promise.resolve();
  return hold.opened;
}

/**
 * The address of a request, as fetch takes it.
 *
 * @param input - a string, a URL or a Request
 * @returns the address as text
 */
export function requestAddress(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
