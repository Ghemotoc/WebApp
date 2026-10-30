/**
 * The stand-in picture check for local work, the tests and staging until the real services are
 * set up (story S1-E10-05; architecture 1.7.3, B15: "IMAGE_CHECK=stub passes every file except
 * names ending _fail").
 *
 * Who calls it: index.ts, when PICTURE_CHECK isn't "real".
 * The rule reads the original file name, before its ending:
 * - "…_fail" is flagged for nudity, "…_gore" for gore;
 * - "…_match" is a known-abuse match (a same-day safeguarding case);
 * - "…_down" gets no answer, as if the services were down;
 * - anything else passes.
 * It never sends the file anywhere.
 */
import type { PictureFile, PictureVerdict } from './index';

/**
 * The file name without its folder or ending, in lower case.
 *
 * @param originalName - for example "My cover_FAIL.png"
 * @returns for example "my cover_fail"
 */
export function nameStem(originalName: string): string {
  const baseName = originalName.split(/[\\/]/).pop() ?? '';
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  return stem.toLowerCase();
}

/**
 * Checks a file by its name only.
 *
 * @param file - the uploaded file
 * @returns the stub's verdict (provider "stub")
 */
export function checkWithStub(file: PictureFile): Promise<PictureVerdict> {
  const stem = nameStem(file.originalName);
  const verdict: PictureVerdict = {
    outcome: 'passed',
    flags: {},
    isKnownAbuseMatch: false,
    provider: 'stub',
  };
  if (stem.endsWith('_fail')) {
    verdict.outcome = 'flagged';
    verdict.flags = { 'stub.nudity': 0.99 };
  } else if (stem.endsWith('_gore')) {
    verdict.outcome = 'flagged';
    verdict.flags = { 'stub.gore': 0.99 };
  } else if (stem.endsWith('_match')) {
    verdict.outcome = 'flagged';
    verdict.flags = { 'stub.known_match': true };
    verdict.isKnownAbuseMatch = true;
  } else if (stem.endsWith('_down')) {
    verdict.outcome = 'unavailable';
  }
  return Promise.resolve(verdict);
}
