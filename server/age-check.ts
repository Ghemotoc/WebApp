/**
 * The age check's server side (story S1-E2-08, part 08a; ADR 0010).
 *
 * The addresses, all under /api/age-check/:
 * - POST start, with the person's own sign-in: asks the database which age line to check
 *   (my_age_check()), creates a session at Yoti with a fresh random reference_id, links it to the
 *   person through begin_age_check() signed with AGE_CHECK_SECRET, and answers only the session
 *   ID, our SDK ID and the page to open (criterion 1);
 * - POST webhook, from Yoti with no sign-in: checks Yoti's signature, fetches the result from
 *   Yoti, and stores it through record_age_check_result() signed with AGE_CHECK_SECRET
 *   (criteria 4 and 5); an unsigned call is refused before anything else;
 * - GET stub/check and stub/finish: the stand-in's own page and its choice, only while YOTI isn't
 *   "real" (server/age-check/stub.ts).
 * No service key is used (CLAUDE.md rule 2): the start acts as the person, the webhook as a
 * visitor whose write only counts when signed. Nothing about the person or the check is logged
 * (rule 12), and no picture, document or estimated age ever reaches our server (rule 5).
 * Who calls it: functions/api/age-check/[[path]].ts on Cloudflare, server/pages-functions-plugin.ts
 * locally; src/features/age-check/ calls start.
 */
import type { AgeCheckFailure, AgeCheckResult } from '../src/schemas/ageCheck';

import { ageCheckService, usesStandIn, type AgeCheckSettings } from './age-check/index';
import { standInCheckPage, standInNotification } from './age-check/stub';
import type { AgeCheckService } from './age-check/types';
import { bearerToken } from './picture-check';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface AgeCheckOptions {
  supabaseUrl: string;
  anonKey: string;
  /** AGE_CHECK_SECRET; the same value is in Vault as age_check_secret. */
  secret: string | undefined;
  settings: AgeCheckSettings;
}

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<AgeCheckFailure, number> = {
  signed_out: 401,
  not_needed: 409,
  unavailable: 503,
  unreachable: 503,
};

/** What my_age_check() answers that the start step reads. */
interface MyAgeCheck {
  outcome: string;
  threshold?: number;
  can_start?: boolean;
}

/**
 * A JSON answer that no cache keeps.
 *
 * @returns the response
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Calls one database function, as the person (their token) or as a visitor (the anon key).
 *
 * @returns the function's answer, or null when the database refused or didn't answer
 */
async function callDatabase<T>(
  options: AgeCheckOptions,
  name: string,
  body: Record<string, unknown>,
  token: string | null,
): Promise<T | null> {
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${token ?? options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null || !response.ok) return null;
  return (await response.json()) as T;
}

/**
 * POST start: a new session at Yoti, linked to the person.
 *
 * @returns { sessionId, sdkId, checkUrl }, or { error } with its status
 */
async function start(
  request: Request,
  options: AgeCheckOptions & { secret: string },
  service: AgeCheckService,
): Promise<Response> {
  const fail = (failure: AgeCheckFailure) => json({ error: failure }, statusForFailure[failure]);
  // Step 1: the person's own sign-in.
  const token = bearerToken(request);
  if (token === null) return fail('signed_out');
  // Step 2: which line to check, and whether a check can start at all.
  const mine = await callDatabase<MyAgeCheck>(options, 'my_age_check', {}, token);
  if (mine === null) return fail('unavailable');
  if (mine.outcome !== 'ok' || mine.can_start !== true || mine.threshold === undefined)
    return fail('not_needed');
  // Step 3: the session at Yoti, with a reference that says nothing about the person.
  const origin = new URL(request.url).origin;
  const created = await service.createSession({
    threshold: mine.threshold,
    referenceId: crypto.randomUUID(),
    returnUrl: `${origin}/age-check/return`,
    notificationUrl: `${origin}/api/age-check/webhook`,
  });
  if (created === null) return fail('unreachable');
  // Step 4: the signed link between the session and the person.
  const payload = `begin|${created.sessionId}|${mine.threshold}`;
  const begun = await callDatabase<{ outcome: string }>(
    options,
    'begin_age_check',
    {
      yoti_session_id: created.sessionId,
      threshold: mine.threshold,
      signature: await hmacHex(payload, options.secret),
    },
    token,
  );
  if (begun === null) return fail('unavailable');
  if (begun.outcome !== 'ok') return fail('not_needed');
  return json(
    { sessionId: created.sessionId, sdkId: service.sdkId, checkUrl: created.checkUrl },
    200,
  );
}

/**
 * Stores one finished session's result, signed, through record_age_check_result().
 *
 * @returns true when the database took it
 */
async function storeResult(
  options: AgeCheckOptions & { secret: string },
  sessionId: string,
  result: AgeCheckResult,
): Promise<boolean> {
  const payload = `result|${sessionId}|${result.outcome}|${result.method}`;
  const stored = await callDatabase<{ outcome: string }>(
    options,
    'record_age_check_result',
    {
      yoti_session_id: sessionId,
      outcome: result.outcome,
      method: result.method,
      signature: await hmacHex(payload, options.secret),
    },
    null,
  );
  return stored !== null;
}

/**
 * A notification: verified, its result fetched from the service, then stored.
 *
 * @param rawBody - the notification exactly as it arrived (its signature covers these bytes)
 * @returns 200 when handled (stored, or nothing to store yet); 401 for an unsigned call; 503
 *   when the database didn't answer, so Yoti tries again
 */
export async function handleNotification(
  rawBody: string,
  headers: Headers,
  options: AgeCheckOptions & { secret: string },
  service: AgeCheckService,
): Promise<Response> {
  // Step 1: Yoti's signature, before anything else (criterion 4).
  const sessionId = await service.readNotification(rawBody, headers);
  if (sessionId === null) return json({ error: 'not_signed' }, 401);
  // Step 2: the result from the service itself; nothing to store while it isn't finished.
  const result = await service.fetchResult(sessionId, rawBody);
  if (result === null) return json({ stored: false }, 200);
  // Step 3: only the result, its date and its method are stored (criterion 5).
  const isStored = await storeResult(options, sessionId, result);
  return isStored ? json({ stored: true }, 200) : json({ error: 'unavailable' }, 503);
}

/**
 * GET stub/finish: the stand-in page's choice, sent to our own webhook logic, then back to the
 * return page.
 *
 * @returns a redirect to /age-check/return
 */
async function standInFinish(
  request: Request,
  options: AgeCheckOptions & { secret: string },
  service: AgeCheckService,
): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const origin = new URL(request.url).origin;
  const outcome = query.get('outcome') === 'passed' ? 'passed' : 'failed';
  const method = query.get('method') === 'id_document' ? 'id_document' : 'facial_estimation';
  const body = await standInNotification(query.get('sessionId') ?? '', { outcome, method });
  await handleNotification(body, new Headers(), options, service);
  return Response.redirect(`${origin}/age-check/return`, 303);
}

/**
 * Sends a request that has the secret and a service to its address.
 *
 * @returns the answer, or 404 for an unknown address
 */
async function route(
  path: string,
  request: Request,
  ready: AgeCheckOptions & { secret: string },
  service: AgeCheckService,
): Promise<Response> {
  const call = `${request.method} ${path}`;
  if (call === 'POST start') return start(request, ready, service);
  if (call === 'POST webhook')
    return handleNotification(await request.text(), request.headers, ready, service);
  if (call === 'GET stub/finish') return standInFinish(request, ready, service);
  return json({ error: 'not_found' }, 404);
}

/**
 * Answers every /api/age-check/ address.
 *
 * @param request - the request
 * @param options - the database, the secret and Yoti's settings
 * @returns the answer; 404 for an unknown address or a stand-in page in real mode; 503 without
 *   the secret or, in real mode, without Yoti's credentials
 * Errors: none thrown; nothing is logged.
 */
export async function handleAgeCheck(
  request: Request,
  options: AgeCheckOptions,
): Promise<Response> {
  const address = new URL(request.url);
  const path = address.pathname.replace(/^\/api\/age-check\//, '');
  // Step 1: the stand-in's pages exist only while the stand-in is on.
  if (path.startsWith('stub/') && !usesStandIn(options.settings))
    return json({ error: 'not_found' }, 404);
  if (path === 'stub/check' && request.method === 'GET')
    return standInCheckPage(request, address.origin);
  // Step 2: everything else needs the secret and a service.
  const service = ageCheckService(options.settings, address.origin);
  if (!options.secret || service === null) return json({ error: 'unavailable' }, 503);
  // Step 3: the address.
  return route(path, request, { ...options, secret: options.secret }, service);
}
