/**
 * Yoti's Age Verification API (story S1-E2-08, part 08a; ADR 0010), used only when YOTI is
 * "real" and our credentials are set (GO-LIVE).
 *
 * - createSession: POST /api/v1/sessions with our API key and SDK ID (Cloudflare secrets only,
 *   never the browser). Facial estimation and the ID document route are both allowed (criterion
 *   2), each with Yoti's own retry limit; the reference_id is a random UUID with no personal data.
 * - readNotification: Yoti signs each notification; the signature is RSA-PSS with SHA-256 over
 *   the raw body, checked against Yoti's public key (criterion 4). An unsigned or invalid call is
 *   refused before anything else happens.
 * - fetchResult: GET /api/v1/sessions/{id}/result, so the result always comes from Yoti itself,
 *   never from what the notification says.
 * The addresses, the request fields, the signature header and its salt length were written from
 * Yoti's documentation and must be checked against it before go-live (ADR 0010). The age buffer
 * at the 13 line and whether Yoti also checks the 16 line are OPEN (story S1-E2-08), so none is
 * set here.
 * Who calls it: server/age-check/index.ts.
 */
import type { AgeCheckResult } from '../../src/schemas/ageCheck';

import type { AgeCheckService, NewAgeCheckSession } from './types';

/** Yoti's Age Verification API and hosted page. */
const yotiAddress = 'https://age.yoti.com';

/** The header that carries Yoti's notification signature (base64). */
export const yotiSignatureHeader = 'x-yoti-signature';

/** How long Yoti keeps a session open, in seconds; our own row expires after 30 minutes. */
const sessionSeconds = 900;

/** Our Yoti credentials and the key Yoti signs notifications with. */
export interface YotiCredentials {
  apiKey: string;
  sdkId: string;
  /** Yoti's public key for notifications, as PEM ("-----BEGIN PUBLIC KEY-----…"). */
  notificationPublicKey: string;
}

/** The parts of Yoti's session result we read. */
interface YotiResult {
  status?: string;
  method?: string;
}

/**
 * The request body for a new session: both methods, one line, our return and notice addresses.
 *
 * @returns Yoti's session settings
 */
export function yotiSessionBody(session: NewAgeCheckSession): Record<string, unknown> {
  const method = { allowed: true, threshold: session.threshold, level: 'PASSIVE', retry_limit: 1 };
  return {
    type: 'OVER',
    ttl: sessionSeconds,
    reference_id: session.referenceId,
    // Criterion 2: the person chooses facial estimation or an ID document; nothing else.
    age_estimation: method,
    doc_scan: { ...method, authenticity: 'AUTO' },
    digital_id: { allowed: false },
    credit_card: { allowed: false },
    mobile: { allowed: false },
    callback: { auto: true, url: session.returnUrl },
    cancel_url: session.returnUrl,
    notification_url: session.notificationUrl,
    synchronous_checks: true,
  };
}

/**
 * Turns Yoti's result into ours: COMPLETE is a pass and FAIL a failure; anything else (still
 * going, cancelled, expired) stores nothing. Only the two methods we offer count.
 *
 * @returns the result, or null
 */
export function resultFromYoti(result: YotiResult): AgeCheckResult | null {
  const methods: Record<string, AgeCheckResult['method']> = {
    AGE_ESTIMATION: 'facial_estimation',
    DOC_SCAN: 'id_document',
  };
  const method = methods[result.method ?? ''];
  if (method === undefined) return null;
  if (result.status === 'COMPLETE') return { outcome: 'passed', method };
  if (result.status === 'FAIL') return { outcome: 'failed', method };
  return null;
}

/**
 * Bytes from base64 text.
 *
 * @returns the bytes, or null for text that isn't base64
 */
function base64Bytes(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Checks an RSA-PSS SHA-256 signature over a text with a PEM public key.
 *
 * @returns true only for a valid signature; false for anything malformed
 */
export async function verifyPssSignature(
  text: string,
  signatureBase64: string,
  publicKeyPem: string,
): Promise<boolean> {
  // Step 1: the key's bytes from between the PEM lines.
  const keyText = publicKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const keyBytes = base64Bytes(keyText);
  const signature = base64Bytes(signatureBase64);
  if (keyBytes === null || signature === null || keyBytes.length === 0) return false;
  // Step 2: Web Crypto checks the signature; a bad key or signature is simply "not signed".
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      keyBytes,
      { name: 'RSA-PSS', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      { name: 'RSA-PSS', saltLength: 32 },
      key,
      signature,
      new TextEncoder().encode(text),
    );
  } catch {
    return false;
  }
}

/**
 * The session ID a notification names.
 *
 * @returns the ID, or null when the body isn't a notification
 */
function sessionIdFrom(rawBody: string): string | null {
  try {
    const body = JSON.parse(rawBody) as { session_id?: unknown };
    return typeof body.session_id === 'string' && body.session_id !== '' ? body.session_id : null;
  } catch {
    return null;
  }
}

/**
 * The real Yoti service.
 *
 * @param credentials - our API key, SDK ID and Yoti's notification key
 * @returns the service
 */
export function realYoti(credentials: YotiCredentials): AgeCheckService {
  const headers = {
    Authorization: `Bearer ${credentials.apiKey}`,
    'Yoti-Sdk-Id': credentials.sdkId,
    'Content-Type': 'application/json',
  };
  return {
    sdkId: credentials.sdkId,
    createSession: async (session) => {
      const response = await fetch(`${yotiAddress}/api/v1/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(yotiSessionBody(session)),
      }).catch(() => null);
      if (response === null || !response.ok) return null;
      const created = (await response.json().catch(() => ({}))) as { id?: unknown };
      if (typeof created.id !== 'string') return null;
      const query = new URLSearchParams({ sessionId: created.id, sdkId: credentials.sdkId });
      return { sessionId: created.id, checkUrl: `${yotiAddress}?${query.toString()}` };
    },
    readNotification: async (rawBody, requestHeaders) => {
      const signature = requestHeaders.get(yotiSignatureHeader) ?? '';
      const isSigned = await verifyPssSignature(
        rawBody,
        signature,
        credentials.notificationPublicKey,
      );
      return isSigned ? sessionIdFrom(rawBody) : null;
    },
    fetchResult: async (sessionId) => {
      const address = `${yotiAddress}/api/v1/sessions/${encodeURIComponent(sessionId)}/result`;
      const response = await fetch(address, { headers }).catch(() => null);
      if (response === null || !response.ok) return null;
      return resultFromYoti((await response.json().catch(() => ({}))) as YotiResult);
    },
  };
}
