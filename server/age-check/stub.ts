/**
 * The Yoti stand-in (story S1-E2-08, part 08a; ADR 0010; docs/mocks.md: YOTI unset or "stub").
 *
 * It plays Yoti's part without leaving our server, so the whole road (start, the check page, the
 * signed notification, the stored result and the return page) runs locally, in the tests and on
 * staging before there is a Yoti contract:
 * - "Yoti's" page is our own small page at /api/age-check/stub/check, with a pass by selfie, a
 *   pass by ID document, a failure and Cancel;
 * - a choice goes to /api/age-check/stub/finish, which sends our webhook a notification signed
 *   with the stand-in's fixed key and then sends the person back to /age-check/return;
 * - the "result" is what that signed notification says.
 * The stand-in lets anyone pass, so it must never be on where minors can join: GO-LIVE sets
 * YOTI to "real" (docs/mocks.md). Its pages answer 404 in real mode, and the real service never
 * accepts its notifications.
 * Who calls it: server/age-check/index.ts (the service) and server/age-check.ts (the pages).
 */
import { ageCheckResultSchema, type AgeCheckResult } from '../../src/schemas/ageCheck';
import { hmacHex } from '../signup-context';

import type { AgeCheckService } from './types';

/**
 * The stand-in's own signing key. Stand-in notifications only ever count while the stand-in is
 * on, so this key protects nothing; real mode checks Yoti's own signature instead.
 */
const standInKey = 'age-check-stand-in-key-not-a-secret';

/** A stand-in notification: the session, the choice made on the stand-in page and its key. */
interface StandInNotification extends AgeCheckResult {
  session_id: string;
  signature: string;
}

/** The text the stand-in signs for one choice. */
function standInPayload(sessionId: string, result: AgeCheckResult): string {
  return `stand-in|${sessionId}|${result.outcome}|${result.method}`;
}

/**
 * A stand-in notification for a choice made on the stand-in page.
 *
 * @returns the JSON body our webhook receives
 */
export async function standInNotification(
  sessionId: string,
  result: AgeCheckResult,
): Promise<string> {
  const signature = await hmacHex(standInPayload(sessionId, result), standInKey);
  const body: StandInNotification = { session_id: sessionId, ...result, signature };
  return JSON.stringify(body);
}

/**
 * Reads a stand-in notification and checks its key.
 *
 * @returns the session and the choice, or null for anything not signed by the stand-in
 */
async function readStandIn(
  rawBody: string,
): Promise<{ sessionId: string; result: AgeCheckResult } | null> {
  let body: Partial<StandInNotification>;
  try {
    body = JSON.parse(rawBody) as Partial<StandInNotification>;
  } catch {
    return null;
  }
  const result = ageCheckResultSchema.safeParse(body);
  if (!result.success || typeof body.session_id !== 'string') return null;
  const expected = await hmacHex(standInPayload(body.session_id, result.data), standInKey);
  return body.signature === expected ? { sessionId: body.session_id, result: result.data } : null;
}

/**
 * The stand-in Yoti.
 *
 * @param origin - our own address (for example http://localhost:5173), where its page lives
 * @returns the service
 */
export function standInYoti(origin: string): AgeCheckService {
  return {
    sdkId: '',
    createSession: (session) => {
      const sessionId = `stand-in-${crypto.randomUUID()}`;
      const query = new URLSearchParams({ sessionId, line: String(session.threshold) });
      return Promise.resolve({
        sessionId,
        checkUrl: `${origin}/api/age-check/stub/check?${query.toString()}`,
      });
    },
    readNotification: async (rawBody) => (await readStandIn(rawBody))?.sessionId ?? null,
    fetchResult: async (sessionId, rawBody) => {
      const read = await readStandIn(rawBody);
      return read !== null && read.sessionId === sessionId ? read.result : null;
    },
  };
}

/** Text made safe to put inside HTML. */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * The stand-in check page: two ways to pass, a failure and Cancel.
 *
 * @param request - GET /api/age-check/stub/check?sessionId=…&line=13|18
 * @param origin - our own address; the way back is always ours, never taken from the address
 * @returns the page
 */
export function standInCheckPage(request: Request, origin: string): Response {
  const query = new URL(request.url).searchParams;
  const sessionId = query.get('sessionId') ?? '';
  const line = query.get('line') === '18' ? '18' : '13';
  const finish = (outcome: string, method: string) =>
    `${origin}/api/age-check/stub/finish?${new URLSearchParams({ sessionId, outcome, method }).toString()}`;
  const links = [
    { label: 'Pass with a selfie', href: finish('passed', 'facial_estimation') },
    { label: 'Pass with an ID document', href: finish('passed', 'id_document') },
    { label: 'Fail', href: finish('failed', 'facial_estimation') },
    { label: 'Cancel', href: `${origin}/age-check/return?cancelled=1` },
  ];
  const buttons = links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}" style="display:inline-flex;align-items:center;min-height:44px;padding:0 18px;margin:0 12px 12px 0;border-radius:999px;border:1px solid #481C5F;color:#481C5F;font-weight:600;text-decoration:none">${escapeHtml(link.label)}</a>`,
    )
    .join('');
  const heading = `Yoti stand-in: are you ${line} or over?`;
  const line1 =
    'This page stands in for Yoti while there is no Yoti contract. Nothing leaves our server and no picture is taken.';
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head><body style="font-family:system-ui,sans-serif;margin:0;padding:32px 16px;color:#26142E;background:#FBF8F4"><main style="max-width:560px;margin:0 auto"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(line1)}</p><p>${buttons}</p></main></body></html>`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
