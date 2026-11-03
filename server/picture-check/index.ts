/**
 * The picture check adapter: one way to ask "may this uploaded picture be shown?", whichever
 * services answer (story S1-E10-05; CLAUDE.md rule 19: every uploaded picture is checked before
 * anyone else sees it).
 *
 * Who calls it: server/picture-check.ts (the POST /api/picture-check handler).
 * What it calls: the stub (stub.ts) when PICTURE_CHECK is "stub" or unset, otherwise Arachnid
 * Shield (arachnid.ts: known child sexual abuse material) on every picture. Sightengine
 * (sightengine.ts: nudity and gore) is off: Robert decided on 2 Nov 2026, 08:19 that it isn't
 * used, because a moderator looks at every picture in an All ages or 13+ story and every picture
 * from an under-16 (bundle ADMIN-2, part e1). It stays here, switched on only by
 * PICTURE_CHECK_SIGHTENGINE = "on", so it could come back without new code. The answers are merged
 * into one verdict.
 * Nothing here logs the picture, its name or who uploaded it (CLAUDE.md rule 12).
 */
import { checkWithArachnidShield, type ArachnidCredentials } from './arachnid';
import { checkWithSightengine, type SightengineCredentials } from './sightengine';
import { checkWithStub } from './stub';

/** One uploaded file, as the services receive it. */
export interface PictureFile {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
  /** The name the person's computer gave the file. Only the stub reads it. */
  originalName: string;
}

/** What one service says about a picture. */
export interface ServiceAnswer {
  /** passed: nothing found; flagged: a person must look; unavailable: no answer this time. */
  outcome: 'passed' | 'flagged' | 'unavailable';
  /** Labels and scores only, never the picture: shown to the moderator on the case. */
  flags: Record<string, number | string | boolean>;
  /** True only when Arachnid Shield matched known abuse material. */
  isKnownAbuseMatch: boolean;
}

/** The merged answer, in the shape record_picture_check() reads. */
export interface PictureVerdict extends ServiceAnswer {
  provider: string;
}

/** A function that checks one file. */
export type CheckPicture = (file: PictureFile) => Promise<PictureVerdict>;

/** The settings Cloudflare (or the local server) passes in. */
export interface PictureCheckSettings {
  /** "real" uses the services; anything else, or nothing, uses the stub. */
  mode: string | undefined;
  /** "on" adds Sightengine to Arachnid Shield; anything else, or nothing, leaves it off. */
  sightengineMode?: string | undefined;
  sightengine: SightengineCredentials;
  arachnid: ArachnidCredentials;
}

/**
 * Merges the two services' answers: one that didn't answer makes the whole check unavailable
 * (the picture stays private and is tried again), any flag holds the picture, a known-abuse match
 * always counts as flagged.
 *
 * @param answers - one answer per service, keyed by the service's name
 * @returns the verdict for record_picture_check()
 */
export function mergeAnswers(answers: Record<string, ServiceAnswer>): PictureVerdict {
  const names = Object.keys(answers);
  const values = Object.values(answers);
  // Step 1: the flags of every service, each prefixed with its name so a moderator sees who said what.
  const flags: PictureVerdict['flags'] = {};
  for (const name of names) {
    for (const [label, value] of Object.entries(answers[name]?.flags ?? {})) {
      flags[`${name}.${label}`] = value;
    }
  }
  const isKnownAbuseMatch = values.some((answer) => answer.isKnownAbuseMatch);
  // Step 2: a match or a flag wins over everything; then a missing answer; otherwise it passed.
  let outcome: PictureVerdict['outcome'] = 'passed';
  if (values.some((answer) => answer.outcome === 'unavailable')) outcome = 'unavailable';
  if (isKnownAbuseMatch || values.some((answer) => answer.outcome === 'flagged'))
    outcome = 'flagged';
  return { outcome, flags, isKnownAbuseMatch, provider: names.join('+') };
}

/**
 * Picks the checker for these settings.
 *
 * @param settings - the mode and the services' credentials
 * @returns a function that checks one file: the stub, Arachnid Shield alone, or both services
 *   when Sightengine is switched on; with mode "real" and missing credentials, every check is
 *   unavailable, so nothing is ever shown unchecked
 */
export function pictureChecker(settings: PictureCheckSettings): CheckPicture {
  if (settings.mode !== 'real') return checkWithStub;
  if (settings.sightengineMode !== 'on') {
    // The decided set-up (Robert, 2 Nov 2026): Arachnid Shield alone.
    return async (file) =>
      mergeAnswers({ arachnid: await checkWithArachnidShield(file, settings.arachnid) });
  }
  return async (file) => {
    // Both services run at once; each turns its own failure into "unavailable".
    const [sightengine, arachnid] = await Promise.all([
      checkWithSightengine(file, settings.sightengine),
      checkWithArachnidShield(file, settings.arachnid),
    ]);
    return mergeAnswers({ sightengine, arachnid });
  };
}
