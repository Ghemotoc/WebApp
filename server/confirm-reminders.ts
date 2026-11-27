/**
 * The one "confirm your email" reminder (CONFIRM-1; Robert, 27 Nov 2026, 18:30 UTC: "If people
 * haven't validated their accounts after 7 days, they should receive a reminder to do so").
 *
 * How it works (handleConfirmReminders, POST /api/confirm-reminders):
 * 1. the database wakes us every hour while a reminder is due (run_confirm_reminder_worker(), with
 *    the notification emails' worker key), so only a call with that key is answered;
 * 2. confirm_reminder_claim() hands over the accounts still unconfirmed 7 days after sign-up;
 * 3. for each, Supabase Auth is asked to send the sign-up email again (POST /auth/v1/resend, with
 *    the public key, the same call as "Send the link again" on the sign-up page). Auth makes a
 *    fresh link (we never make or store one) and calls our Send Email hook, which words it as the
 *    reminder because the account is more than a day old (server/send-email.ts);
 * 4. confirm_reminder_mark_sent() marks what left, so it never goes twice; a refused one stays due
 *    and is tried on a later run, at most 3 times.
 * Never logged: addresses or keys (CLAUDE.md rule 12).
 * Who calls it: functions/api/confirm-reminders.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally.
 */

/** What the worker needs from its surroundings. */
export interface ConfirmReminderOptions {
  supabaseUrl: string;
  anonKey: string;
  /** EMAIL_WORKER_KEY; without it nothing is sent (503). */
  workerKey: string | undefined;
}

/** One due reminder, as confirm_reminder_claim() answers it. */
export interface ClaimedConfirmReminder {
  id: string;
  email: string;
}

/** A JSON answer that is never cached. */
function jsonAnswer(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** The headers every call to Supabase carries: the public key only, never the service key. */
function publicHeaders(anonKey: string): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Calls one worker function with the public key; the function itself checks the worker key.
 *
 * @returns the response, or null when the database can't be reached
 */
function callDatabase(
  name: string,
  body: unknown,
  options: ConfirmReminderOptions,
): Promise<Response | null> {
  return fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: publicHeaders(options.anonKey),
    body: JSON.stringify(body),
  }).catch(() => null);
}

/**
 * Asks Supabase Auth to send one account's sign-up email again, with a fresh link.
 *
 * @param email - the address the account signed up with
 * @param options - the database's address and public key
 * @returns true when Auth took it
 */
export async function askAuthToResend(
  email: string,
  options: ConfirmReminderOptions,
): Promise<boolean> {
  const answer = await fetch(`${options.supabaseUrl}/auth/v1/resend`, {
    method: 'POST',
    headers: publicHeaders(options.anonKey),
    body: JSON.stringify({ type: 'signup', email }),
  }).catch(() => null);
  return answer !== null && answer.ok;
}

/**
 * Asks Auth for each reminder, carrying on past a refusal.
 *
 * @returns the account IDs whose reminder left
 */
async function sendEach(
  claimed: ClaimedConfirmReminder[],
  options: ConfirmReminderOptions,
): Promise<string[]> {
  const sentIds: string[] = [];
  for (const reminder of claimed) {
    // One at a time, so Auth's own limits see a steady trickle rather than a burst.
    if (await askAuthToResend(reminder.email, options)) sentIds.push(reminder.id);
  }
  return sentIds;
}

/**
 * Answers POST /api/confirm-reminders.
 *
 * @param request - the call from run_confirm_reminder_worker(), "Authorization: Bearer <key>"
 * @param options - the database and the worker key
 * @returns 200 with { sent, failed }; 401 for a wrong key; 503 when the key isn't set or the
 *   database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleConfirmReminders(
  request: Request,
  options: ConfirmReminderOptions,
): Promise<Response> {
  // Step 1: only the database's own call, with the worker key.
  const workerKey = options.workerKey ?? '';
  if (workerKey === '') return jsonAnswer({ error: 'not_set_up' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== workerKey) return jsonAnswer({ error: 'not_allowed' }, 401);
  // Step 2: the accounts whose reminder is due.
  const claim = await callDatabase(
    'confirm_reminder_claim',
    { worker_key: workerKey, batch_size: 20 },
    options,
  );
  if (claim === null || !claim.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  const claimed = (await claim.json()) as ClaimedConfirmReminder[];
  // Step 3: ask Auth for each, then mark only what left.
  const sentIds = await sendEach(claimed, options);
  if (sentIds.length > 0) {
    const marked = await callDatabase(
      'confirm_reminder_mark_sent',
      { worker_key: workerKey, profile_ids: sentIds },
      options,
    );
    if (marked === null || !marked.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  }
  return jsonAnswer({ sent: sentIds.length, failed: claimed.length - sentIds.length }, 200);
}
