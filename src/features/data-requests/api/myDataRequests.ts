/**
 * Settings › Data requests: the signed-in person's own data requests, and their answer when the
 * team asks whether a request made by email or post was theirs (bundle ADMIN-2, part c1; story
 * S1-E11-09 criterion 4; GDPR art. 12(6)).
 *
 * Signing in to the account is the identity check: the answer comes from the account itself, so
 * nothing is ever sent to an address taken from the request.
 * Who calls it: hooks/useMyDataRequests.ts.
 * What it calls next: my_data_requests() and answer_data_request() in
 * supabase/migrations/…_admin2_c1_data_requests.sql. Neither ever returns staff notes or who
 * handled the request.
 */
import { z } from 'zod';

import type { AppSupabaseClient } from '@/lib/supabase';

import { dataRequestChannels, dataRequestTypes, type DataRequestIdentity } from './dataRequests';

/** The shape my_data_requests() answers, checked before the page uses it. */
const myDataRequestSchema = z.object({
  reference: z.string(),
  request_type: z.enum(dataRequestTypes),
  channel: z.enum(dataRequestChannels),
  received_on: z.string(),
  deadline: z.string(),
  extension_reason: z.string().nullable(),
  identity: z.enum(['not_needed', 'not_asked', 'asked', 'confirmed', 'denied']),
  state: z.enum(['open', 'closed']),
});

/** One of the person's own requests. */
export interface MyDataRequest {
  /** "D-000001": the reference the team and the person quote. */
  reference: string;
  requestType: (typeof dataRequestTypes)[number];
  channel: (typeof dataRequestChannels)[number];
  receivedOn: string;
  deadline: string;
  /** Why the team needs more time, when they extended the deadline. */
  extensionReason: string | null;
  identity: DataRequestIdentity;
  isOpen: boolean;
}

/** The error a refused or failed call throws. */
export class MyDataRequestError extends Error {
  constructor(readonly failure: 'not_waiting' | 'unreachable') {
    super(`The data request call failed: ${failure}`);
    this.name = 'MyDataRequestError';
  }
}

/**
 * Reads the person's own requests, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the requests
 * Errors: throws MyDataRequestError('unreachable') when the database can't be reached or refuses.
 */
export async function fetchMyDataRequests(client: AppSupabaseClient): Promise<MyDataRequest[]> {
  const { data, error } = await client.rpc('my_data_requests');
  if (error !== null) throw new MyDataRequestError('unreachable');
  const parsed = z.array(myDataRequestSchema).safeParse(data);
  if (!parsed.success) throw new MyDataRequestError('unreachable');
  return parsed.data.map((row) => ({
    reference: row.reference,
    requestType: row.request_type,
    channel: row.channel,
    receivedOn: row.received_on,
    deadline: row.deadline,
    extensionReason: row.extension_reason,
    identity: row.identity,
    isOpen: row.state === 'open',
  }));
}

/**
 * Says whether a request the team asked about was the person's.
 *
 * @param client - the shared Supabase client
 * @param reference - the request's reference
 * @param isMine - true: it was me; false: it wasn't me
 * Errors: throws MyDataRequestError: not_waiting when the team isn't waiting for an answer (or
 *   the request isn't the person's), unreachable otherwise.
 */
export async function answerMyDataRequest(
  client: AppSupabaseClient,
  reference: string,
  isMine: boolean,
): Promise<void> {
  const { error } = await client.rpc('answer_data_request', {
    request_reference: reference,
    is_mine: isMine,
  });
  if (error === null) return;
  const isRefused = error.hint === 'not_waiting' || error.hint === 'no_such_request';
  throw new MyDataRequestError(isRefused ? 'not_waiting' : 'unreachable');
}
