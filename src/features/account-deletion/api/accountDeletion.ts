/**
 * The database calls of Delete my account (story S1-E13-03; GDPR art. 17).
 *
 * Who calls it: the hooks in ../hooks (Settings › Delete account and the closing-account page).
 * What it calls next: my_account_deletion(), request_account_deletion() and
 * cancel_account_deletion() (supabase/migrations/…_s1_e13_03_delete_my_account.sql), and
 * Supabase Auth for "Log in again to confirm" (signInWithPassword in features/auth).
 */
import { signInWithPassword, type SignInResult } from '@/features/auth/api/signIn';
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Why an account is closing: the person chose "Delete my account", or nobody used it for 5 years
 * and the nightly job closed it (INACTIVE-2).
 */
export type ClosingReason = 'requested' | 'unused';

/** Where the account stands: open (with whether it may be deleted now) or closing. */
export type AccountDeletionState =
  | { state: 'open'; signedInRecently: boolean; deletionDays: number }
  | { state: 'closing'; requestedAt: string; deleteAfter: string; reason: ClosingReason };

/** What request_account_deletion() answered. */
export type DeletionRequestOutcome =
  | { outcome: 'closing'; deleteAfter: string }
  // The last log-in is older than a few minutes: the person logs in again first.
  | { outcome: 'sign_in_again' }
  // A staff account: an owner removes the staff role first.
  | { outcome: 'staff_account' };

/** my_account_deletion()'s answer, as the database writes it. */
interface DeletionStateReply {
  state?: string;
  signed_in_recently?: boolean;
  deletion_days?: number;
  requested_at?: string;
  delete_after?: string;
  reason?: string;
}

/**
 * Reads where the signed-in person's account stands.
 *
 * @param client - the shared Supabase client
 * @returns open or closing
 * Errors: throws when the database can't be reached or the person is signed out.
 */
export async function fetchMyAccountDeletion(
  client: AppSupabaseClient,
): Promise<AccountDeletionState> {
  const { data, error } = await client.rpc('my_account_deletion');
  if (error !== null) throw new Error(`Could not check the account: ${error.message}`);
  const reply = data as DeletionStateReply;
  // A closing account always has both dates.
  if (
    reply.state === 'closing' &&
    reply.requested_at !== undefined &&
    reply.delete_after !== undefined
  ) {
    return {
      state: 'closing',
      requestedAt: reply.requested_at,
      deleteAfter: reply.delete_after,
      // Anything but 'unused' is treated as the person's own request, the careful reading.
      reason: reply.reason === 'unused' ? 'unused' : 'requested',
    };
  }
  return {
    state: 'open',
    signedInRecently: reply.signed_in_recently === true,
    deletionDays: reply.deletion_days ?? 14,
  };
}

/**
 * Asks to delete the signed-in person's account: it closes now and is deleted for good later.
 *
 * @param client - the shared Supabase client
 * @returns closing with the date, or why not
 * Errors: throws when the database can't be reached or refuses for another reason.
 */
export async function requestAccountDeletion(
  client: AppSupabaseClient,
): Promise<DeletionRequestOutcome> {
  const { data, error } = await client.rpc('request_account_deletion');
  // The database's hints name the two refusals the screen explains.
  if (error?.hint === 'sign_in_again') return { outcome: 'sign_in_again' };
  if (error?.hint === 'staff_account') return { outcome: 'staff_account' };
  if (error !== null) throw new Error(`Could not delete the account: ${error.message}`);
  const reply = data as { delete_after: string };
  return { outcome: 'closing', deleteAfter: reply.delete_after };
}

/**
 * Keeps the signed-in person's closing account ("Keep account").
 *
 * @param client - the shared Supabase client
 * Errors: throws when the database can't be reached.
 */
export async function cancelAccountDeletion(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.rpc('cancel_account_deletion');
  if (error !== null) throw new Error(`Could not keep the account: ${error.message}`);
}

/**
 * "Log in again to confirm" with the password, for the email of the account already signed in.
 *
 * @param client - the shared Supabase client
 * @param password - as typed
 * @returns signed_in, or why not (the same answers as the log-in page)
 * Errors: throws when Supabase can't be reached or nobody is signed in.
 */
export async function confirmWithPassword(
  client: AppSupabaseClient,
  password: string,
): Promise<SignInResult> {
  const { data } = await client.auth.getSession();
  const email = data.session?.user.email;
  if (email === undefined) throw new Error('Signed out.');
  return signInWithPassword(client, email, password);
}
