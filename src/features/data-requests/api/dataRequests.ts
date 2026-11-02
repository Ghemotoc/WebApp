/**
 * Staff › Data requests: the log of every request to see, move, correct or delete someone's data,
 * with its deadline, any extension and the identity check (bundle ADMIN-2, part c1; story
 * S1-E11-09, part 09a; screen 8.12; GDPR art. 12(3), 12(6) and 5(2)).
 *
 * Who calls it: hooks/useStaffDataRequests.ts.
 * What it calls next: admin_open_data_request(), admin_data_requests(), admin_data_request(),
 * admin_extend_data_request(), admin_ask_data_request_confirmation() and
 * admin_close_data_request() in supabase/migrations/…_admin2_c1_data_requests.sql. Each one
 * checks that the caller is owner, admin or support in a staff session and writes the audit log;
 * this file only reads the answers and names the refusals.
 */
import { z } from 'zod';

import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What the person asked for (the database's data_request_type). */
export const dataRequestTypes = ['copy', 'move', 'correct', 'delete', 'other'] as const;
export type DataRequestType = (typeof dataRequestTypes)[number];

/** How the request reached us (the database's data_request_channel). */
export const dataRequestChannels = ['in_app', 'email', 'post'] as const;
export type DataRequestChannel = (typeof dataRequestChannels)[number];

/**
 * Where the identity check stands: not_needed (made inside the signed-in account), not_asked,
 * asked, confirmed or denied (the database's data_request_identity).
 */
export type DataRequestIdentity = 'not_needed' | 'not_asked' | 'asked' | 'confirmed' | 'denied';

/**
 * How close an open request is to its deadline: overdue, alert (2 days or fewer), reminder
 * (7 days or fewer), on_time, or closed (S1-E11-09 criterion 2, proposal).
 */
export type DataRequestUrgency = 'overdue' | 'alert' | 'reminder' | 'on_time' | 'closed';

/** The shape data_request_json() answers, checked before the page uses it. */
const dataRequestSchema = z.object({
  id: z.string(),
  reference: z.string(),
  user_id: z.string(),
  handle: z.string().nullable(),
  is_under_16: z.boolean(),
  request_type: z.enum(dataRequestTypes),
  channel: z.enum(dataRequestChannels),
  received_on: z.string(),
  due_on: z.string(),
  extended_to: z.string().nullable(),
  extension_reason: z.string().nullable(),
  deadline: z.string(),
  urgency: z.enum(['overdue', 'alert', 'reminder', 'on_time', 'closed']),
  identity: z.enum(['not_needed', 'not_asked', 'asked', 'confirmed', 'denied']),
  identity_asked_at: z.string().nullable(),
  identity_answered_at: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  outcome: z.string().nullable(),
  closed_at: z.string().nullable(),
  note: z.string(),
  handled_by_handle: z.string().nullable(),
  created_at: z.string(),
});

/** One data request as the staff pages show it: never an email or a year of birth. */
export interface DataRequest {
  id: string;
  reference: string;
  /** Staff may see user IDs (architecture 1.6); the person never sees theirs here. */
  userId: string;
  handle: string | null;
  /** Under 16: the request goes through a parent or guardian (part c2). */
  isUnder16: boolean;
  requestType: DataRequestType;
  channel: DataRequestChannel;
  receivedOn: string;
  /** One month from receipt (GDPR art. 12(3)). */
  dueOn: string;
  extendedTo: string | null;
  extensionReason: string | null;
  /** The extension when there is one, otherwise dueOn. */
  deadline: string;
  urgency: DataRequestUrgency;
  identity: DataRequestIdentity;
  identityAskedAt: string | null;
  identityAnsweredAt: string | null;
  isOpen: boolean;
  outcome: string | null;
  closedAt: string | null;
  note: string;
  handledByHandle: string | null;
  createdAt: string;
}

/** Why a call failed: the database's hints, then "refused", "not_allowed" and "unreachable". */
export const dataRequestFailures = [
  'not_allowed',
  'no_such_person',
  'bad_date',
  'note_too_long',
  'no_such_request',
  'request_closed',
  'reason_needed',
  'bad_months',
  'too_late',
  'no_check_needed',
  'already_answered',
  'parent_needed',
  'outcome_needed',
  'refused',
  'unreachable',
] as const;
export type DataRequestFailure = (typeof dataRequestFailures)[number];

/** The error a refused or failed call throws. */
export class DataRequestError extends Error {
  constructor(readonly failure: DataRequestFailure) {
    super(`The data request call failed: ${failure}`);
    this.name = 'DataRequestError';
  }
}

/**
 * Turns a database error into a DataRequestError.
 *
 * @param error - Postgres's hint and code
 * @returns the error: by hint, then 42501 as not_allowed, 23514 as refused, otherwise unreachable
 */
export function dataRequestErrorFrom(error: { hint?: string | null; code?: string }) {
  const knownHint = dataRequestFailures.find((failure) => failure === error.hint);
  if (knownHint !== undefined) return new DataRequestError(knownHint);
  if (error.code === '42501') return new DataRequestError('not_allowed');
  if (error.code === '23514') return new DataRequestError('refused');
  return new DataRequestError('unreachable');
}

/**
 * Reads one request from the database's answer.
 *
 * @param value - one data_request_json() object
 * @returns the request
 * Errors: throws DataRequestError('unreachable') when the answer has another shape.
 */
export function dataRequestFrom(value: Json | undefined): DataRequest {
  const parsed = dataRequestSchema.safeParse(value);
  if (!parsed.success) throw new DataRequestError('unreachable');
  const row = parsed.data;
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    handle: row.handle,
    isUnder16: row.is_under_16,
    requestType: row.request_type,
    channel: row.channel,
    receivedOn: row.received_on,
    dueOn: row.due_on,
    extendedTo: row.extended_to,
    extensionReason: row.extension_reason,
    deadline: row.deadline,
    urgency: row.urgency,
    identity: row.identity,
    identityAskedAt: row.identity_asked_at,
    identityAnsweredAt: row.identity_answered_at,
    isOpen: row.state === 'open',
    outcome: row.outcome,
    closedAt: row.closed_at,
    note: row.note,
    handledByHandle: row.handled_by_handle,
    createdAt: row.created_at,
  };
}

/**
 * Lists the requests: open ones first, nearest deadline first, then closed ones.
 *
 * @param client - the shared Supabase client
 * @param onlyOpen - true leaves closed ones out
 * @returns at most 200 requests
 * Errors: throws DataRequestError (not_allowed for anyone but owner, admin and support).
 */
export async function fetchDataRequests(
  client: AppSupabaseClient,
  onlyOpen: boolean,
): Promise<DataRequest[]> {
  const { data, error } = await client.rpc('admin_data_requests', { only_open: onlyOpen });
  if (error !== null) throw dataRequestErrorFrom(error);
  if (!Array.isArray(data)) throw new DataRequestError('unreachable');
  return data.map((row) => dataRequestFrom(row));
}

/**
 * Reads one request.
 *
 * @param client - the shared Supabase client
 * @param requestId - the request
 * @returns the request
 * Errors: throws DataRequestError (not_allowed, no_such_request).
 */
export async function fetchDataRequest(
  client: AppSupabaseClient,
  requestId: string,
): Promise<DataRequest> {
  const { data, error } = await client.rpc('admin_data_request', { target_request_id: requestId });
  if (error !== null) throw dataRequestErrorFrom(error);
  return dataRequestFrom(data);
}

/** What staff fill in to log a new request. */
export interface NewDataRequest {
  /** The account, found by user ID, handle or email on the form. */
  userId: string;
  requestType: DataRequestType;
  channel: DataRequestChannel;
  /** The date it reached us, as yyyy-mm-dd. */
  receivedOn: string;
  note: string;
}

/**
 * Logs a new request; the deadline is one month from receipt.
 *
 * @param client - the shared Supabase client
 * @param wanted - the request
 * @returns the new request
 * Errors: throws DataRequestError (not_allowed, no_such_person, bad_date, note_too_long).
 */
export async function openDataRequest(
  client: AppSupabaseClient,
  wanted: NewDataRequest,
): Promise<DataRequest> {
  const { data, error } = await client.rpc('admin_open_data_request', {
    target_user_id: wanted.userId,
    request_type: wanted.requestType,
    channel: wanted.channel,
    received_on: wanted.receivedOn,
    note: wanted.note,
  });
  if (error !== null) throw dataRequestErrorFrom(error);
  return dataRequestFrom(data);
}

/** One action staff take on an open request. */
export type DataRequestAction =
  | { kind: 'extend'; extraMonths: 1 | 2; reason: string }
  | { kind: 'ask' }
  | { kind: 'close'; outcome: string };

/**
 * Sends one action to the database. Extending and asking also tell the person (a notice they
 * can't switch off, emailed to the account's own address).
 *
 * @param client - the shared Supabase client
 * @param requestId - the request
 * @param action - what to do
 * @returns the request as it now stands
 * Errors: throws DataRequestError with the database's reason.
 */
export async function actOnDataRequest(
  client: AppSupabaseClient,
  requestId: string,
  action: DataRequestAction,
): Promise<DataRequest> {
  const answer = await sendAction(client, requestId, action);
  if (answer.error !== null) throw dataRequestErrorFrom(answer.error);
  return dataRequestFrom(answer.data);
}

/**
 * Picks the database function for an action.
 *
 * @returns Supabase's answer
 */
function sendAction(client: AppSupabaseClient, requestId: string, action: DataRequestAction) {
  if (action.kind === 'extend') {
    return client.rpc('admin_extend_data_request', {
      target_request_id: requestId,
      extra_months: action.extraMonths,
      reason: action.reason,
    });
  }
  if (action.kind === 'ask') {
    return client.rpc('admin_ask_data_request_confirmation', { target_request_id: requestId });
  }
  return client.rpc('admin_close_data_request', {
    target_request_id: requestId,
    outcome: action.outcome,
  });
}
