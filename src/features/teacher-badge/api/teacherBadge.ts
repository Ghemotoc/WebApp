/**
 * The Teacher badge's calls, the person's side (story S1-E2-11).
 *
 * Who calls it: the hooks in ../hooks/ and TeacherConfirmPage.
 * What it calls next:
 * - my_teacher_check() (…_s1_e2_11_teacher_badge.sql): whether the person may ask, has the badge,
 *   and their latest request with its outcome and reason;
 * - POST /api/teacher-check/link (server/teacher-check.ts) with the person's own sign-in: our
 *   server makes the link and emails it to the school address, so the app never sees the token;
 *   only the domain is stored;
 * - confirm_teacher_email(token): the link is opened (signed in or not; the token is the key);
 * - the proof: prepared first (a picture loses its location data, ../../pictures/lib/
 *   preparePicture.ts), uploaded to the private teacher-proofs bucket under a random name, then
 *   submit_teacher_proof() puts it in the staff queue. The person can't read it back.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  endingForPreparedType,
  PicturePreparationError,
  preparePicture,
} from '@/features/pictures/lib/preparePicture';

import {
  teacherLinkFailureSchema,
  type TeacherLinkFailure,
  type TeacherLinkRequest,
} from '../../../schemas/teacherCheck';

/** Where a request stands. */
export type TeacherCheckStatus = 'link_sent' | 'waiting_for_staff' | 'approved' | 'rejected';

/** The two ways to show you teach (board 2.5, step 3). */
export type TeacherCheckWay = 'school_email' | 'proof';

/** The newest request, as the screens show it. */
export interface LatestTeacherCheck {
  way: TeacherCheckWay;
  status: TeacherCheckStatus;
  schoolDomain: string | null;
  requestedAt: string;
  decidedAt: string | null;
  reason: string | null;
  linkExpiresAt: string | null;
}

/** What onboarding step 3 and Settings › Teacher badge know. */
export interface MyTeacherCheck {
  canAsk: boolean;
  isTeacher: boolean;
  badgeSince: string | null;
  latest: LatestTeacherCheck | null;
}

/** What my_teacher_check() answers. */
interface MyTeacherCheckRow {
  outcome: string;
  can_ask: boolean;
  is_teacher: boolean;
  badge_since: string | null;
  latest: {
    way: TeacherCheckWay;
    status: TeacherCheckStatus;
    school_domain: string | null;
    requested_at: string;
    decided_at: string | null;
    reason: string | null;
    link_expires_at: string | null;
  } | null;
}

/** The cache key of the person's badge. */
export const myTeacherCheckQueryKey = (userId: string | null) => ['my-teacher-check', userId];

/**
 * Reads the person's badge and latest request.
 *
 * @param client - the shared Supabase client
 * @returns the badge, or null without a live profile
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyTeacherCheck(
  client: AppSupabaseClient,
): Promise<MyTeacherCheck | null> {
  const answer = await client.rpc('my_teacher_check');
  if (answer.error !== null)
    throw new Error(`Could not read the Teacher badge: ${answer.error.message}`);
  const row = answer.data as unknown as MyTeacherCheckRow;
  if (row.outcome !== 'ok') return null;
  const latest = row.latest;
  return {
    canAsk: row.can_ask,
    isTeacher: row.is_teacher,
    badgeSince: row.badge_since,
    latest:
      latest === null
        ? null
        : {
            way: latest.way,
            status: latest.status,
            schoolDomain: latest.school_domain,
            requestedAt: latest.requested_at,
            decidedAt: latest.decided_at,
            reason: latest.reason,
            linkExpiresAt: latest.link_expires_at,
          },
  };
}

/** Why a step didn't work: the server's reasons, plus the proof's own. */
export type TeacherBadgeFailure = TeacherLinkFailure | 'wrong_type' | 'too_big' | 'no_file';

/** A step that didn't work, with the reason the screen shows. */
export class TeacherBadgeError extends Error {
  readonly failure: TeacherBadgeFailure;

  constructor(failure: TeacherBadgeFailure) {
    super(`The Teacher badge step didn't work: ${failure}`);
    this.failure = failure;
  }
}

/**
 * The person's sign-in token, for our server.
 *
 * @returns the token
 * @throws TeacherBadgeError('signed_out') without one
 */
async function accessTokenOf(client: AppSupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new TeacherBadgeError('signed_out');
  return token;
}

/**
 * Asks our server to email a link to the school address.
 *
 * @param client - the shared Supabase client (for the sign-in token)
 * @param request - the school address and the email's language
 * @throws TeacherBadgeError with the server's reason (personal_address, too_soon, …)
 */
export async function sendSchoolEmailLink(
  client: AppSupabaseClient,
  request: TeacherLinkRequest,
): Promise<void> {
  const token = await accessTokenOf(client);
  const response = await fetch('/api/teacher-check/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  }).catch(() => null);
  if (response === null) throw new TeacherBadgeError('unavailable');
  if (response.ok) return;
  const failed = teacherLinkFailureSchema.safeParse(await response.json().catch(() => null));
  throw new TeacherBadgeError(failed.success ? failed.data.error : 'unavailable');
}

/** The proof types people may pick, and the largest file (the bucket's limit; OPEN, 10 MB). */
export const proofTypes = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const largestProofBytes = 10 * 1024 * 1024;

/** A proof picture is redrawn this big at most: large enough to read a staff card or a letter. */
const proofLongestSide = 2400;

/**
 * Gets the chosen file ready: a picture is redrawn with only its pixels (no location data); a PDF
 * goes as it is.
 *
 * @param file - the chosen file
 * @returns the file to upload and its ending
 * @throws TeacherBadgeError wrong_type or too_big
 */
async function prepareProof(file: File): Promise<{ file: File; ending: string }> {
  if (!proofTypes.some((type) => type === file.type)) throw new TeacherBadgeError('wrong_type');
  if (file.size > largestProofBytes) throw new TeacherBadgeError('too_big');
  if (file.type === 'application/pdf') return { file, ending: 'pdf' };
  const prepared = await preparePicture(file, proofLongestSide).catch((error: unknown) => {
    throw error instanceof PicturePreparationError ? new TeacherBadgeError('wrong_type') : error;
  });
  return { file: prepared, ending: endingForPreparedType(prepared.type) };
}

/**
 * Uploads the proof and puts it in the staff queue.
 *
 * @param client - the shared Supabase client
 * @param file - the chosen file
 * @throws TeacherBadgeError wrong_type, too_big, not_available (Storage or the database refused)
 *   or no_file
 */
export async function sendTeacherProof(client: AppSupabaseClient, file: File): Promise<void> {
  // Step 1: the file itself, then a random name, never the user ID (architecture 1.6).
  const proof = await prepareProof(file);
  const path = `${crypto.randomUUID()}.${proof.ending}`;
  // Step 2: into the private bucket; only staff with Schools access can open it.
  const stored = await client.storage
    .from('teacher-proofs')
    .upload(path, proof.file, { contentType: proof.file.type });
  if (stored.error !== null) throw new TeacherBadgeError('not_available');
  // Step 3: the request, which the staff queue shows.
  const { error } = await client.rpc('submit_teacher_proof', { proof_path: path });
  if (error === null) return;
  throw new TeacherBadgeError(error.hint === 'no_file' ? 'no_file' : 'not_available');
}

/** What opening a school email link did. */
export type ConfirmOutcome = 'approved' | 'waiting_for_staff' | 'expired' | 'gone';

/**
 * Confirms a school address from its link.
 *
 * @param client - the shared Supabase client (signed out is fine: the token is the key)
 * @param token - the token after "#" in the link
 * @returns what happened
 * Errors: throws when the database can't be reached.
 */
export async function confirmTeacherEmail(
  client: AppSupabaseClient,
  token: string,
): Promise<ConfirmOutcome> {
  const { data, error } = await client.rpc('confirm_teacher_email', { token });
  if (error !== null) throw new Error(`Could not confirm the school address: ${error.message}`);
  const outcome = (data as { outcome?: string }).outcome;
  const known: ConfirmOutcome[] = ['approved', 'waiting_for_staff', 'expired'];
  return known.find((each) => each === outcome) ?? 'gone';
}
