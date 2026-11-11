/**
 * The teacher's side of class certificates and the staff look-up and revoke (bundle CLASSES, part
 * e; story S1-E8-12 criteria 1, 5 and 7).
 *
 * Who calls it: hooks/useClassCertificates.ts. What it calls next: class_certificates(),
 * issue_class_certificates(), admin_certificate() and admin_revoke_certificate() in
 * supabase/migrations/…_classes_e_certificates.sql. Only the class's teacher signs; only staff
 * with Schools access look up or revoke; the database checks both.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { CertificateLook } from '../lib/certificateLook';

import {
  certificateErrorFrom,
  lookFrom,
  objectOf,
  resultOrNull,
  textOrNull,
  type CertificateResult,
} from './certificates';

/** One certificate in the teacher's list. Never the student's printed name. */
export interface ClassCertificate {
  studentHandle: string;
  studentName: string;
  programmeName: string;
  result: CertificateResult;
  code: string;
  signedAt: string;
  isRevoked: boolean;
  /** The colour and pattern it was signed with (G13a). */
  look: CertificateLook;
}

/** One line of the results list the teacher approves. */
export interface ClassResultEntry {
  handle: string;
  result: CertificateResult;
}

/** One certificate as staff see it. Never the printed name. */
export interface StaffCertificate {
  code: string;
  status: 'valid' | 'revoked';
  programmeName: string;
  result: CertificateResult;
  className: string;
  schoolName: string | null;
  teacherName: string;
  signedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  studentHandle: string;
}

/**
 * Reads one row of class_certificates().
 *
 * @param value - one element of the answer
 * @returns the certificate
 */
export function classCertificateFrom(value: Json): ClassCertificate {
  const row = objectOf(value);
  const student = objectOf(row['student']);
  const studentHandle = String(student['handle'] ?? '');
  return {
    studentHandle,
    studentName: textOrNull(student['display_name']) ?? studentHandle,
    programmeName: String(row['programme_name']),
    result: resultOrNull(row['result']) ?? 'participant',
    code: String(row['code']),
    signedAt: String(row['signed_at']),
    isRevoked: row['is_revoked'] === true,
    look: lookFrom(row),
  };
}

/**
 * Every certificate issued in a class, newest first.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns the certificates
 * @throws CertificateError when refused (not_allowed, missing) or unreachable
 */
export async function listClassCertificates(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassCertificate[]> {
  const { data, error } = await client.rpc('class_certificates', { slug });
  if (error) throw certificateErrorFrom(error);
  return Array.isArray(data) ? data.map(classCertificateFrom) : [];
}

/**
 * The teacher approves and signs a programme's results.
 *
 * @param client - the Supabase client
 * @param request - the class, the programme's name, one result per student and the look (G13a)
 * @returns how many certificates were made or changed
 * @throws CertificateError when refused (teacher_only, not_member, programme, empty, archived,
 *   look)
 */
export async function issueClassCertificates(
  client: AppSupabaseClient,
  request: {
    slug: string;
    programmeName: string;
    results: ClassResultEntry[];
    look: CertificateLook;
  },
): Promise<number> {
  const { data, error } = await client.rpc('issue_class_certificates', {
    slug: request.slug,
    programme_name: request.programmeName,
    results: request.results.map((entry) => ({ handle: entry.handle, result: entry.result })),
    look: { colour: request.look.colour, pattern: request.look.pattern },
  });
  if (error) throw certificateErrorFrom(error);
  return Number(objectOf(data)['issued'] ?? 0);
}

/**
 * Reads the answer of admin_certificate().
 *
 * @param value - the answer (an object)
 * @returns the certificate
 */
export function staffCertificateFrom(value: Json): StaffCertificate {
  const row = objectOf(value);
  return {
    code: String(row['code']),
    status: row['status'] === 'revoked' ? 'revoked' : 'valid',
    programmeName: String(row['programme_name']),
    result: resultOrNull(row['result']) ?? 'participant',
    className: String(row['class_name'] ?? ''),
    schoolName: textOrNull(row['school_name']),
    teacherName: String(row['teacher_name'] ?? ''),
    signedAt: String(row['signed_at']),
    revokedAt: textOrNull(row['revoked_at']),
    revokeReason: textOrNull(row['revoke_reason']),
    studentHandle: String(objectOf(row['student'])['handle'] ?? ''),
  };
}

/**
 * Staff look a certificate up by its code.
 *
 * @param client - the Supabase client
 * @param code - the code as typed
 * @returns the certificate, or null when there is none
 * @throws CertificateError when refused (not_allowed) or unreachable
 */
export async function findStaffCertificate(
  client: AppSupabaseClient,
  code: string,
): Promise<StaffCertificate | null> {
  const { data, error } = await client.rpc('admin_certificate', { code });
  if (error) throw certificateErrorFrom(error);
  return data === null ? null : staffCertificateFrom(data);
}

/**
 * Staff revoke a certificate, with a reason.
 *
 * @param client - the Supabase client
 * @param request - the code and the reason
 * @throws CertificateError when refused (not_allowed, missing, reason, revoked)
 */
export async function revokeCertificate(
  client: AppSupabaseClient,
  request: { code: string; reason: string },
): Promise<void> {
  const { error } = await client.rpc('admin_revoke_certificate', {
    code: request.code,
    reason: request.reason,
  });
  if (error) throw certificateErrorFrom(error);
}
