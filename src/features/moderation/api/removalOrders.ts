/**
 * Removal orders: the order's timeline, Emergency disable, acknowledging the on-call alert and the
 * on-call rota (story S1-E10-09; Regulation (EU) 2021/784).
 *
 * Who calls it: hooks/useRemovalOrder.ts (the case page's removal-order panel),
 * hooks/usePublicNotices.ts (acknowledge, on the queue) and hooks/useOnCallRota.ts (/staff/on-call).
 * What it calls next: admin_order_timeline(), admin_emergency_disable(),
 * admin_acknowledge_on_call_alert(), admin_on_call_rota(), admin_set_on_call_shift() and
 * admin_remove_on_call_shift() (…_s1_e10_09_removal_orders.sql). Each checks the caller's role,
 * the on-call permission where it applies, and writes the audit log.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** Every time that proves how an order was handled. */
export interface OrderTimeline {
  receivedAt: string | null;
  deadlineAt: string | null;
  alertedAt: string | null;
  onCallHandle: string | null;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  disabledAt: string | null;
  preserveUntil: string | null;
  authorityToldAt: string | null;
  uploaderTold: boolean;
  authorityName: string | null;
}

/** One shift on the rota. */
export interface OnCallShift {
  id: string;
  handle: string;
  startsAt: string;
  endsAt: string;
  isNow: boolean;
}

/** The rota page's contents. */
export interface OnCallRota {
  canEdit: boolean;
  onCallNowHandle: string | null;
  shifts: OnCallShift[];
  gaps: Array<{ startsAt: string; endsAt: string }>;
  people: Array<{ userId: string; handle: string }>;
}

/** A JSON object, or an empty one. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as an object.
 *
 * @param json - any JSON
 * @returns the object, or an empty one
 */
function objectOf(json: Json | undefined): JsonObject {
  return json !== null && typeof json === 'object' && !Array.isArray(json) ? json : {};
}

/**
 * Reads a JSON value as a list of objects.
 *
 * @param json - any JSON
 * @returns the objects in it
 */
function listOf(json: Json | undefined): JsonObject[] {
  return Array.isArray(json) ? json.map(objectOf) : [];
}

/**
 * Reads a text field, or null.
 *
 * @returns the text
 */
function text(record: JsonObject, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Reads one order's timeline.
 *
 * @param client - the shared Supabase client
 * @param caseId - the order's case
 * @returns the times
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function fetchOrderTimeline(
  client: AppSupabaseClient,
  caseId: string,
): Promise<OrderTimeline> {
  const { data, error } = await client.rpc('admin_order_timeline', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  const row = objectOf(data);
  return {
    receivedAt: text(row, 'received_at'),
    deadlineAt: text(row, 'deadline_at'),
    alertedAt: text(row, 'alerted_at'),
    onCallHandle: text(row, 'on_call_handle'),
    acknowledgedAt: text(row, 'acknowledged_at'),
    escalatedAt: text(row, 'escalated_at'),
    disabledAt: text(row, 'disabled_at'),
    preserveUntil: text(row, 'preserve_until'),
    authorityToldAt: text(row, 'authority_told_at'),
    uploaderTold: row.uploader_told === true,
    authorityName: text(row, 'authority_name'),
  };
}

/** What Emergency disable needs. */
export interface EmergencyDisable {
  note: string;
  messageToPerson: string;
  tellUploader: boolean;
}

/**
 * "Emergency disable": the item comes down everywhere, the case is decided and the item kept six
 * months; the uploader is told unless the order forbids it.
 *
 * @param client - the shared Supabase client
 * @param caseId - the order's case
 * @param request - the note, the message to the uploader and whether to tell them
 * Errors: throws ModerationError: not_allowed (no on-call permission), refused (not an open order,
 *   or a blank note) or unreachable.
 */
export async function emergencyDisable(
  client: AppSupabaseClient,
  caseId: string,
  request: EmergencyDisable,
): Promise<void> {
  const { error } = await client.rpc('admin_emergency_disable', {
    target_case_id: caseId,
    note_text: request.note,
    message_to_person: request.messageToPerson,
    tell_uploader: request.tellUploader,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Acknowledges an on-call alert, which stops its escalation.
 *
 * @param client - the shared Supabase client
 * @param alertId - the alert
 * Errors: throws ModerationError: not_allowed, refused (already acknowledged) or unreachable.
 */
export async function acknowledgeAlert(client: AppSupabaseClient, alertId: string): Promise<void> {
  const { error } = await client.rpc('admin_acknowledge_on_call_alert', { alert_id: alertId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Reads the on-call rota.
 *
 * @param client - the shared Supabase client
 * @returns the shifts that haven't ended, the gaps, and who may take a shift
 * Errors: throws ModerationError('not_allowed') outside staff.
 */
export async function fetchOnCallRota(client: AppSupabaseClient): Promise<OnCallRota> {
  const { data, error } = await client.rpc('admin_on_call_rota');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  const rota = objectOf(data);
  return {
    canEdit: rota.can_edit === true,
    onCallNowHandle: text(objectOf(rota.on_call_now), 'handle'),
    shifts: listOf(rota.shifts).map((shift) => ({
      id: text(shift, 'id') ?? '',
      handle: text(shift, 'handle') ?? '',
      startsAt: text(shift, 'starts_at') ?? '',
      endsAt: text(shift, 'ends_at') ?? '',
      isNow: shift.is_now === true,
    })),
    gaps: listOf(rota.gaps).map((gap) => ({
      startsAt: text(gap, 'starts_at') ?? '',
      endsAt: text(gap, 'ends_at') ?? '',
    })),
    people: listOf(rota.people).map((person) => ({
      userId: text(person, 'user_id') ?? '',
      handle: text(person, 'handle') ?? '',
    })),
  };
}

/** A new shift. */
export interface NewShift {
  userId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

/**
 * Puts someone on call for a shift.
 *
 * @param client - the shared Supabase client
 * @param shift - who, from when to when, and why
 * Errors: throws ModerationError: not_allowed (not owner or admin), refused (no on-call
 *   permission, an overlap, an end before the start, no reason) or unreachable.
 */
export async function setOnCallShift(client: AppSupabaseClient, shift: NewShift): Promise<void> {
  const { error } = await client.rpc('admin_set_on_call_shift', {
    on_call_user_id: shift.userId,
    shift_starts_at: shift.startsAt,
    shift_ends_at: shift.endsAt,
    reason_given: shift.reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Removes a shift that hasn't ended.
 *
 * @param client - the shared Supabase client
 * @param shiftId - the shift
 * @param reason - why
 * Errors: throws ModerationError: not_allowed, refused or unreachable.
 */
export async function removeOnCallShift(
  client: AppSupabaseClient,
  shiftId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_on_call_shift', {
    shift_id: shiftId,
    reason_given: reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
