/**
 * Arachnid Shield: matches an uploaded picture against known child sexual abuse material, run by
 * the Canadian Centre for Child Protection (story S1-E10-05; decided 16 Oct 2026, late evening).
 *
 * Who calls it: index.ts, when PICTURE_CHECK is "real".
 * What it calls: https://shield.projectarachnid.com/v1/media/ with the file as the request body
 * and the account's user name and password (ARACHNID_SHIELD_USERNAME and
 * ARACHNID_SHIELD_PASSWORD, only in Cloudflare's secrets; a data processing agreement is a GO-LIVE
 * item). A match opens a same-day safeguarding case and keeps the file as evidence; the legal
 * report to the authorities is made by a person (S1-E10-10).
 * Nothing is logged.
 */
import type { PictureFile, ServiceAnswer } from './index';

/** The account's user name and password; empty strings when not set up. */
export interface ArachnidCredentials {
  username: string;
  password: string;
}

/** Arachnid Shield's address for checking one file. */
export const arachnidAddress = 'https://shield.projectarachnid.com/v1/media/';

/** The parts of Arachnid Shield's answer this file reads. */
interface ArachnidResponse {
  classification?: string;
  match_type?: string | null;
}

/**
 * Reads Arachnid Shield's answer into ours.
 *
 * @param response - the JSON Arachnid Shield sent
 * @returns passed for "no-known-match", a known-abuse match for any other classification,
 *   unavailable when there is no classification
 */
export function readArachnidResponse(response: ArachnidResponse): ServiceAnswer {
  const classification = response.classification;
  if (typeof classification !== 'string' || classification === '') {
    return { outcome: 'unavailable', flags: {}, isKnownAbuseMatch: false };
  }
  if (classification === 'no-known-match')
    return { outcome: 'passed', flags: {}, isKnownAbuseMatch: false };
  return {
    outcome: 'flagged',
    flags: { classification, match_type: response.match_type ?? 'unknown' },
    isKnownAbuseMatch: true,
  };
}

/**
 * Sends one file to Arachnid Shield.
 *
 * @param file - the uploaded file
 * @param credentials - the user name and password
 * @param fetchFunction - fetch, replaceable in tests
 * @returns the answer; "unavailable" without credentials, on a network error or an error status
 */
export async function checkWithArachnidShield(
  file: PictureFile,
  credentials: ArachnidCredentials,
  fetchFunction: typeof fetch = fetch,
): Promise<ServiceAnswer> {
  const unavailable: ServiceAnswer = {
    outcome: 'unavailable',
    flags: {},
    isKnownAbuseMatch: false,
  };
  if (credentials.username === '' || credentials.password === '') return unavailable;
  // Step 1: basic sign-in, the file as the body with its own type.
  const signIn = btoa(`${credentials.username}:${credentials.password}`);
  const response = await fetchFunction(arachnidAddress, {
    method: 'POST',
    headers: { Authorization: `Basic ${signIn}`, 'Content-Type': file.contentType },
    body: file.bytes,
  }).catch(() => null);
  // Step 2: any failure is "no answer this time", never "passed".
  if (response === null || !response.ok) return unavailable;
  const body = (await response.json().catch(() => null)) as ArachnidResponse | null;
  return body === null ? unavailable : readArachnidResponse(body);
}
