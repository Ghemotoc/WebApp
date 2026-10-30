/**
 * Sightengine: checks an uploaded picture for nudity and gore (story S1-E10-05; decided 16 Oct
 * 2026, late evening: every picture goes to Sightengine on upload).
 *
 * Who calls it: index.ts, when PICTURE_CHECK is "real".
 * What it calls: https://api.sightengine.com/1.0/check.json with the models nudity-2.1 and
 * gore-2.0, sending the file itself. The credentials (SIGHTENGINE_API_USER and
 * SIGHTENGINE_API_SECRET) live only in Cloudflare's secrets; Sightengine needs a data processing
 * agreement before go-live (by-hand-for-robert.md, GO-LIVE).
 * Only labels and scores come back; nothing is logged.
 */
import type { PictureFile, ServiceAnswer } from './index';

/** The account's API user and secret; empty strings when not set up. */
export interface SightengineCredentials {
  apiUser: string;
  apiSecret: string;
}

/** Sightengine's address for checking a file. */
export const sightengineAddress = 'https://api.sightengine.com/1.0/check.json';

/**
 * Scores at or above this hold the picture for a person. Sightengine's scores run from 0 to 1;
 * 0.5 is its own suggested middle. A held picture costs a moderator a minute, a missed one is
 * seen by readers, so the line errs on holding.
 */
export const flagThreshold = 0.5;

/** The nudity classes that hold a picture; "suggestive" and "none" don't. */
const nudityClassesThatHold = ['sexual_activity', 'sexual_display', 'erotica', 'very_suggestive'];

/** The parts of Sightengine's answer this file reads. */
interface SightengineResponse {
  status?: string;
  nudity?: Record<string, unknown>;
  gore?: { prob?: number };
}

/**
 * Reads Sightengine's answer into ours.
 *
 * @param response - the JSON Sightengine sent
 * @returns flagged when any holding class or gore reaches the threshold, passed otherwise,
 *   unavailable when Sightengine said it failed
 */
export function readSightengineResponse(response: SightengineResponse): ServiceAnswer {
  if (response.status !== 'success')
    return { outcome: 'unavailable', flags: {}, isKnownAbuseMatch: false };
  const flags: ServiceAnswer['flags'] = {};
  // Step 1: keep only the scores that reach the line, so the case shows what mattered.
  for (const className of nudityClassesThatHold) {
    const score = response.nudity?.[className];
    if (typeof score === 'number' && score >= flagThreshold) flags[`nudity.${className}`] = score;
  }
  const goreScore = response.gore?.prob;
  if (typeof goreScore === 'number' && goreScore >= flagThreshold) flags['gore'] = goreScore;
  // Step 2: anything kept holds the picture.
  const outcome = Object.keys(flags).length > 0 ? 'flagged' : 'passed';
  return { outcome, flags, isKnownAbuseMatch: false };
}

/**
 * Sends one file to Sightengine.
 *
 * @param file - the uploaded file
 * @param credentials - the API user and secret
 * @param fetchFunction - fetch, replaceable in tests
 * @returns the answer; "unavailable" without credentials, on a network error or an error status
 */
export async function checkWithSightengine(
  file: PictureFile,
  credentials: SightengineCredentials,
  fetchFunction: typeof fetch = fetch,
): Promise<ServiceAnswer> {
  const unavailable: ServiceAnswer = {
    outcome: 'unavailable',
    flags: {},
    isKnownAbuseMatch: false,
  };
  if (credentials.apiUser === '' || credentials.apiSecret === '') return unavailable;
  // Step 1: the form Sightengine expects, with the file under "media".
  const form = new FormData();
  form.append('media', new Blob([file.bytes], { type: file.contentType }), 'picture');
  form.append('models', 'nudity-2.1,gore-2.0');
  form.append('api_user', credentials.apiUser);
  form.append('api_secret', credentials.apiSecret);
  // Step 2: send it; any failure is "no answer this time", never "passed".
  const response = await fetchFunction(sightengineAddress, { method: 'POST', body: form }).catch(
    () => null,
  );
  if (response === null || !response.ok) return unavailable;
  const body = (await response.json().catch(() => null)) as SightengineResponse | null;
  return body === null ? unavailable : readSightengineResponse(body);
}
