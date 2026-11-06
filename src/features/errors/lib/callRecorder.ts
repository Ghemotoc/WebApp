/**
 * callRecorder: notes every call the app makes to the back end, for the call log (bundle LOGS-1,
 * part c; Robert, 6 Nov 2026: "every call that's been made, where it failed, and so on").
 *
 * Who calls it: src/main.tsx calls installCallRecorder() once, before the app draws. It wraps the
 * browser's fetch, so calls from the Supabase client and to our own /api addresses are both seen.
 * What it calls next: lib/describeCall.ts (what the call is), then api/callLog.ts in batches.
 * What it keeps per call: kind, name, method, status, error code, duration, the page's route
 * pattern, the app version and the time. Never what was sent or what came back: for a failed call
 * it reads only the error's code from the answer, never its message (CLAUDE.md rule 12).
 * It never changes a call or its answer, and never throws: if the log can't be sent, the batch is
 * dropped, because logging the logger's own failure would only fail again the same way.
 */
import { appVersion } from '@/config/appVersion';
import { getSupabaseClient } from '@/lib/supabase';

import { sendCalls, type CallEntry } from '../api/callLog';

import { getCurrentRoutePattern } from './currentRoute';
import { describeCall, type CallDescription } from './describeCall';

/** Send after this many calls, or after flushAfterMs, whichever comes first. */
const batchSize = 25;
const flushAfterMs = 15_000;
/** Calls kept while sending is impossible; older ones are dropped first. */
const maximumQueued = 200;
/** Error codes the table accepts (call_log_error_code_shape). */
const errorCodeShape = /^[A-Za-z0-9_.-]{1,40}$/;

/** Calls waiting to be sent. */
const queue: CallEntry[] = [];
/** The timer that sends the queue, or null when none is waiting. */
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Whether the recorder is already in place, so a second call adds nothing. */
let isInstalled = false;

/**
 * Picks the error's code out of a failed answer's body: PostgREST and Postgres give "code", Auth
 * gives "error_code" (or "error" in older versions).
 *
 * @param body - the parsed body
 * @returns the code, or null when there is none in the right shape
 */
function codeFromBody(body: unknown): string | null {
  if (body === null || typeof body !== 'object') return null;
  const fields = body as Record<string, unknown>;
  const code = fields.code ?? fields.error_code ?? fields.error;
  const text = typeof code === 'number' ? String(code) : code;
  return typeof text === 'string' && errorCodeShape.test(text) ? text : null;
}

/**
 * Reads the error's code from a failed answer, never its message.
 *
 * @param response - the answer, which is cloned so the app still reads it
 * @returns the code, or null when the answer isn't JSON or has none
 */
async function errorCodeOf(response: Response): Promise<string | null> {
  if (!(response.headers.get('content-type') ?? '').includes('json')) return null;
  try {
    return codeFromBody(await response.clone().json());
  } catch {
    // An answer that isn't JSON after all has no code to read.
    return null;
  }
}

/** Sends what is queued, at most 50 at a time (log_calls' limit). */
async function flush(): Promise<void> {
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = null;
  const batch = queue.splice(0, 50);
  if (batch.length === 0) return;
  try {
    const client = await getSupabaseClient();
    if (client !== null) await sendCalls(client, batch);
  } catch {
    // Dropped on purpose (see the header): the call log is a help for staff, never in the way.
  }
  if (queue.length > 0) scheduleFlush();
}

/** Sends the queue soon: at once when a batch is full, otherwise after flushAfterMs. */
function scheduleFlush(): void {
  if (queue.length >= batchSize) {
    void flush();
    return;
  }
  flushTimer ??= setTimeout(() => void flush(), flushAfterMs);
}

/**
 * Adds one call to the queue.
 *
 * @param entry - the call
 */
function enqueue(entry: CallEntry): void {
  queue.push(entry);
  if (queue.length > maximumQueued) queue.splice(0, queue.length - maximumQueued);
  scheduleFlush();
}

/**
 * Builds the entry for one finished call.
 *
 * @param call - what the call is
 * @param method - its HTTP method
 * @param started - when it started (Date.now() and performance.now())
 * @param answer - its status and error code
 * @returns the entry
 */
function entryOf(
  call: CallDescription,
  method: string,
  started: { at: number; clock: number },
  answer: { status: number; errorCode: string | null },
): CallEntry {
  return {
    kind: call.kind,
    name: call.name,
    method,
    status: answer.status,
    error_code: answer.errorCode,
    duration_ms: Math.min(Math.round(performance.now() - started.clock), 600_000),
    route: getCurrentRoutePattern(),
    version: appVersion,
    called_at: new Date(started.at).toISOString(),
  };
}

/**
 * Reads the address and method of a fetch, however it was called.
 *
 * @param input - an address, a URL or a Request
 * @param init - the options, if any
 * @returns the address and the method in capitals (GET when none was given)
 */
function addressAndMethodOf(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
): { address: string; method: string } {
  if (input instanceof Request) {
    return { address: input.url, method: (init?.method ?? input.method).toUpperCase() };
  }
  return { address: String(input), method: (init?.method ?? 'GET').toUpperCase() };
}

/**
 * Makes a fetch that notes each call, then answers exactly as the original would.
 *
 * @param originalFetch - the browser's fetch
 * @param supabaseUrl - the Supabase project's address, or "" without one
 * @param pageOrigin - the app's own origin
 * @returns the recording fetch
 */
export function recordingFetch(
  originalFetch: typeof fetch,
  supabaseUrl: string,
  pageOrigin: string,
): typeof fetch {
  return async (input, init) => {
    // Step 1: what the call is; calls that aren't logged go straight through.
    const { address, method } = addressAndMethodOf(input, init);
    const call = describeCall(address, supabaseUrl, pageOrigin);
    if (call === null) return originalFetch(input, init);
    const started = { at: Date.now(), clock: performance.now() };
    // Step 2: make the call; no answer at all is logged as status 0, then the error goes on.
    let response: Response;
    try {
      response = await originalFetch(input, init);
    } catch (error) {
      enqueue(entryOf(call, method, started, { status: 0, errorCode: null }));
      throw error;
    }
    // Step 3: note the outcome; only a failed answer is read, and only for its code.
    const errorCode = response.status >= 400 ? await errorCodeOf(response) : null;
    enqueue(entryOf(call, method, started, { status: response.status, errorCode }));
    return response;
  };
}

/**
 * Puts the recorder in place: wraps window.fetch and sends what is left when the tab is hidden.
 *
 * @param target - the window (tests pass their own)
 */
export function installCallRecorder(target: Window = window): void {
  if (isInstalled) return;
  isInstalled = true;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  target.fetch = recordingFetch(target.fetch.bind(target), supabaseUrl, target.location.origin);
  target.document.addEventListener('visibilitychange', () => {
    if (target.document.visibilityState === 'hidden') void flush();
  });
}

/** For tests: sends the queue now and says how many calls were waiting. */
export async function flushCallsForTest(): Promise<number> {
  const waiting = queue.length;
  await flush();
  return waiting;
}
