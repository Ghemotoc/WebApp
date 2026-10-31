/**
 * Teacher checks for staff (story S1-E2-11; board AdminSchools 8.9, "Verify teachers").
 *
 * Who calls it: hooks/useTeacherChecks.ts.
 * What it calls next: admin_teacher_checks(), admin_teachers(), admin_open_teacher_proof(),
 * admin_decide_teacher_check() and admin_remove_teacher_badge() (…_s1_e2_11_teacher_badge.sql),
 * and Supabase Storage's private teacher-proofs bucket. The database checks Schools access
 * (owner, admin, moderators with the teacher checks permission), logs each proof opened and
 * writes every decision to the audit log.
 * A proof is shown through a signed address that lasts a minute, and deleted before the decision
 * is saved: the database refuses a decision while the file is still there (criterion 6).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One request waiting for staff. Never the user ID or an email address. */
export interface TeacherCheckRequest {
  checkId: string;
  handle: string | null;
  displayName: string;
  way: 'school_email' | 'proof';
  /** The school address's domain, for the email way. */
  schoolDomain: string | null;
  hasProof: boolean;
  requestedAt: string;
}

/** One person with the badge. */
export interface Teacher {
  handle: string | null;
  displayName: string;
  badgeSince: string;
}

/** What staff can decide. */
export type TeacherDecision = 'approved' | 'rejected';

/** Why a call was refused, in words the page can explain. */
export type TeacherCheckFailure = 'not_allowed' | 'refused' | 'unreachable';

/** The error a refused call throws. */
export class TeacherCheckError extends Error {
  constructor(public readonly failure: TeacherCheckFailure) {
    super(`Teacher check call failed: ${failure}`);
  }
}

/** A proof's signed address lasts a minute: long enough to open it, never kept. */
const proofAddressSeconds = 60;

/**
 * The failure for a database error code: 42501 not allowed, 23514 a refused change.
 *
 * @returns the failure
 */
function failureFromCode(code: string | undefined): TeacherCheckFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'refused';
  return 'unreachable';
}

/**
 * Lists the waiting requests, oldest first.
 *
 * @param client - the shared Supabase client
 * @returns the requests
 * Errors: throws TeacherCheckError('not_allowed') for anyone without Schools access.
 */
export async function listTeacherChecks(client: AppSupabaseClient): Promise<TeacherCheckRequest[]> {
  const { data, error } = await client.rpc('admin_teacher_checks');
  if (error !== null) throw new TeacherCheckError(failureFromCode(error.code));
  return data.map((row) => ({
    checkId: row.check_id,
    handle: row.handle,
    displayName: row.display_name,
    way: row.way === 'proof' ? 'proof' : 'school_email',
    schoolDomain: row.school_domain,
    hasProof: row.has_proof,
    requestedAt: row.requested_at,
  }));
}

/**
 * Lists everyone with the badge, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the teachers
 * Errors: as listTeacherChecks().
 */
export async function listTeachers(client: AppSupabaseClient): Promise<Teacher[]> {
  const { data, error } = await client.rpc('admin_teachers');
  if (error !== null) throw new TeacherCheckError(failureFromCode(error.code));
  return data.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    badgeSince: row.badge_since,
  }));
}

/**
 * Opens a proof: logs it, then asks Storage for a short signed address.
 *
 * @param client - the shared Supabase client
 * @param checkId - the request
 * @returns the file's name (needed to delete it) and its address
 * Errors: throws TeacherCheckError with the reason.
 */
export async function openTeacherProof(
  client: AppSupabaseClient,
  checkId: string,
): Promise<{ path: string; url: string }> {
  const opened = await client.rpc('admin_open_teacher_proof', { check_id: checkId });
  if (opened.error !== null) throw new TeacherCheckError(failureFromCode(opened.error.code));
  const signed = await client.storage
    .from('teacher-proofs')
    .createSignedUrl(opened.data, proofAddressSeconds);
  if (signed.error !== null) throw new TeacherCheckError('unreachable');
  return { path: opened.data, url: signed.data.signedUrl };
}

/** A decision on one request. */
export interface TeacherDecisionChange {
  checkId: string;
  decision: TeacherDecision;
  reason: string;
  /** The proof's file name, for the proof way: it is deleted first. */
  proofPath: string | null;
}

/**
 * Records a decision: deletes the proof (if any), then saves the decision.
 *
 * @param client - the shared Supabase client
 * @param change - the request, the decision, the reason and the proof's name
 * Errors: throws TeacherCheckError with the reason the database or Storage gave.
 */
export async function decideTeacherCheck(
  client: AppSupabaseClient,
  change: TeacherDecisionChange,
): Promise<void> {
  // Step 1: the proof goes first (criterion 6); the database checks it is gone.
  if (change.proofPath !== null) {
    const removed = await client.storage.from('teacher-proofs').remove([change.proofPath]);
    if (removed.error !== null) throw new TeacherCheckError('unreachable');
  }
  // Step 2: the decision, the audit log and the person's notification, in one call.
  const { error } = await client.rpc('admin_decide_teacher_check', {
    check_id: change.checkId,
    decision: change.decision,
    reason: change.reason,
  });
  if (error !== null) throw new TeacherCheckError(failureFromCode(error.code));
}

/**
 * Removes a teacher's badge, with a reason.
 *
 * @param client - the shared Supabase client
 * @param change - the teacher's username and the reason
 * Errors: throws TeacherCheckError with the reason the database gave.
 */
export async function removeTeacherBadge(
  client: AppSupabaseClient,
  change: { handle: string; reason: string },
): Promise<void> {
  const { error } = await client.rpc('admin_remove_teacher_badge', {
    teacher_handle: change.handle,
    reason: change.reason,
  });
  if (error !== null) throw new TeacherCheckError(failureFromCode(error.code));
}
