/**
 * Writing certificates: the student's own list and their printed name, the teacher's results list
 * for a class, the public check of a code and the staff revoke (bundle CLASSES, part e; story
 * S1-E8-12).
 *
 * Who calls it: hooks/useCertificates.ts and hooks/useClassCertificates.ts. What it calls next:
 * my_certificates(), set_certificate_printed_name(), verify_certificate(), class_certificates(),
 * issue_class_certificates(), admin_certificate() and admin_revoke_certificate() in
 * supabase/migrations/…_classes_e_certificates.sql. The database checks every rule (only the
 * class's teacher signs, only the student sees their printed name); this file only reads the
 * answers and turns refusals into CertificateError.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What a certificate says the student did: took part, reached the final or won. */
export type CertificateResult = Enums<'certificate_result'>;

/** The three results, in the order the teacher's list offers them. */
export const certificateResults: CertificateResult[] = ['participant', 'finalist', 'winner'];

/** One of the signed-in student's certificates, as "My certificates" and the sheet draw it. */
export interface MyCertificate {
  id: string;
  code: string;
  programmeName: string;
  result: CertificateResult;
  className: string;
  schoolName: string | null;
  teacherName: string;
  signedAt: string;
  isRevoked: boolean;
  /** The real name the student typed, or null: the sheet then prints the pen name. */
  printedName: string | null;
  penName: string;
  /** When the printed name is deleted (30 days after the class is archived), or null. */
  nameDeletedOn: string | null;
  /** Who signs first for the company (the settings table). */
  signatoryName: string;
}

/** What anyone sees when they check a code. Never a name. */
export interface CertificateCheck {
  status: 'valid' | 'revoked' | 'retired' | 'unknown';
  programmeName: string | null;
  result: CertificateResult | null;
  schoolName: string | null;
  signedAt: string | null;
}

/** Why the database refused a call. */
export type CertificateFailure =
  | 'not_allowed'
  | 'teacher_only'
  | 'not_member'
  | 'result'
  | 'programme'
  | 'empty'
  | 'archived'
  | 'missing'
  | 'revoked'
  | 'name_deleted'
  | 'name_length'
  | 'reason'
  | 'unreachable';

/** The error a refused call throws. */
export class CertificateError extends Error {
  constructor(readonly failure: CertificateFailure) {
    super(`The certificate call was refused: ${failure}`);
    this.name = 'CertificateError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, CertificateFailure> = {
  not_allowed: 'not_allowed',
  'space:not_allowed': 'not_allowed',
  'space:missing': 'missing',
  'space:not_class': 'missing',
  'space:archived': 'archived',
  'certificate:teacher_only': 'teacher_only',
  'certificate:not_member': 'not_member',
  'certificate:result': 'result',
  'certificate:programme': 'programme',
  'certificate:empty': 'empty',
  'certificate:missing': 'missing',
  'certificate:revoked': 'revoked',
  'certificate:name_deleted': 'name_deleted',
  'certificate:name_length': 'name_length',
  'certificate:reason': 'reason',
};

/**
 * Turns a database error into a CertificateError.
 *
 * @param error - Postgres's hint and code
 * @returns the failure by hint; a refusal without a hint is not_allowed, anything else unreachable
 */
export function certificateErrorFrom(error: {
  hint?: string | null;
  code?: string;
}): CertificateError {
  const byHint = failureForHint[error.hint ?? ''];
  if (byHint !== undefined) return new CertificateError(byHint);
  if (error.code === '42501') return new CertificateError('not_allowed');
  return new CertificateError('unreachable');
}

/**
 * An object from the answer, or an empty one when it is anything else.
 *
 * @param value - one value of the answer
 * @returns the object
 */
export function objectOf(value: Json | undefined): Record<string, Json | undefined> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * A text value, or null when the database sent anything else.
 *
 * @param value - one field of the answer
 * @returns the text, or null
 */
export function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * A result from the answer, or null when it isn't one of the three.
 *
 * @param value - one field of the answer
 * @returns the result, or null
 */
export function resultOrNull(value: Json | undefined): CertificateResult | null {
  const found = certificateResults.find((result) => result === value);
  return found ?? null;
}

/**
 * Reads one certificate from my_certificates().
 *
 * @param value - one element of the answer
 * @returns the certificate
 */
export function myCertificateFrom(value: Json): MyCertificate {
  const row = objectOf(value);
  return {
    id: String(row['id']),
    code: String(row['code']),
    programmeName: String(row['programme_name']),
    result: resultOrNull(row['result']) ?? 'participant',
    className: String(row['class_name'] ?? ''),
    schoolName: textOrNull(row['school_name']),
    teacherName: String(row['teacher_name'] ?? ''),
    signedAt: String(row['signed_at']),
    isRevoked: row['is_revoked'] === true,
    printedName: textOrNull(row['printed_name']),
    penName: String(row['pen_name'] ?? ''),
    nameDeletedOn: textOrNull(row['name_deleted_on']),
    signatoryName: String(row['signatory_name'] ?? ''),
  };
}

/**
 * The signed-in student's certificates, newest first.
 *
 * @param client - the Supabase client
 * @returns the certificates
 * @throws CertificateError when signed out (not_allowed) or unreachable
 */
export async function listMyCertificates(client: AppSupabaseClient): Promise<MyCertificate[]> {
  const { data, error } = await client.rpc('my_certificates');
  if (error) throw certificateErrorFrom(error);
  return Array.isArray(data) ? data.map(myCertificateFrom) : [];
}

/**
 * Writes or clears the real name a class certificate prints.
 *
 * @param client - the Supabase client
 * @param request - the certificate's ID and the name ("" clears it)
 * @returns the name as saved, or null when cleared
 * @throws CertificateError when refused (missing, revoked, name_deleted, name_length)
 */
export async function setPrintedName(
  client: AppSupabaseClient,
  request: { certificateId: string; printedName: string },
): Promise<string | null> {
  const { data, error } = await client.rpc('set_certificate_printed_name', {
    certificate_id: request.certificateId,
    printed_name: request.printedName,
  });
  if (error) throw certificateErrorFrom(error);
  return textOrNull(objectOf(data)['printed_name']);
}

/**
 * Reads the answer of verify_certificate().
 *
 * @param value - the answer
 * @returns the check
 */
export function certificateCheckFrom(value: Json): CertificateCheck {
  const row = objectOf(value);
  const status = row['status'];
  const isKnown = status === 'valid' || status === 'revoked' || status === 'retired';
  return {
    status: isKnown ? status : 'unknown',
    programmeName: textOrNull(row['programme_name']),
    result: resultOrNull(row['result']),
    schoolName: textOrNull(row['school_name']),
    signedAt: textOrNull(row['signed_at']),
  };
}

/**
 * Checks a certificate's code. Anyone may, signed in or not.
 *
 * @param client - the Supabase client
 * @param code - the code as typed
 * @returns the check
 * @throws CertificateError when unreachable
 */
export async function verifyCertificate(
  client: AppSupabaseClient,
  code: string,
): Promise<CertificateCheck> {
  const { data, error } = await client.rpc('verify_certificate', { code });
  if (error) throw certificateErrorFrom(error);
  return certificateCheckFrom(data);
}
