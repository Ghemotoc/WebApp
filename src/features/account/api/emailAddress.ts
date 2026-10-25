/**
 * The signed-in person's own email address: reading it and asking to change it (story S1-E2-05,
 * added 25 Oct 2026: "every user, minors included, can see their own email in Settings and change
 * it whenever they want"; Robert).
 *
 * The address lives only in Supabase Auth, never in our tables, and only the account's owner
 * reads it here: Auth answers with the signed-in person's own record. Other people never see it
 * (the public profile carries the handle and pen name only, architecture 1.6). Nothing here logs
 * the address (CLAUDE.md rule 12).
 * Who calls it: hooks/useMyEmail.ts and hooks/useEmailChangeForm.ts.
 * What it calls: Supabase Auth's getUser() and updateUser(). With double_confirm_changes on
 * (supabase/config.toml) Supabase emails a link to the old and the new address
 * (supabase/templates/email_change.html); both links lead to /auth/confirm (ConfirmEmailPage).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The person's address now, and the new one waiting for its links to be opened. */
export interface MyEmail {
  email: string | null;
  /** Set while a change waits for both links; null otherwise. */
  pendingEmail: string | null;
}

/** What asking for a change can answer. */
export type EmailChangeOutcome =
  'sent' | 'same_address' | 'invalid_address' | 'address_in_use' | 'too_many_attempts';

/** Supabase Auth's error codes for each refusal we explain in words. */
const invalidCodes = new Set(['email_address_invalid', 'validation_failed']);
const inUseCodes = new Set(['email_exists', 'user_already_exists']);
const rateLimitCodes = new Set(['over_request_rate_limit', 'over_email_send_rate_limit']);

/**
 * Reads the signed-in person's own address from Supabase Auth.
 *
 * @param client - the shared Supabase client
 * @returns the address and any change waiting for confirmation
 * @throws Error when Auth can't be reached or nobody is signed in
 */
export async function fetchMyEmail(client: AppSupabaseClient): Promise<MyEmail> {
  // getUser() asks the Auth server, so a change confirmed on another device shows here too.
  const { data, error } = await client.auth.getUser();
  if (error !== null || data.user === null) throw new Error('Could not read the account.');
  return { email: data.user.email ?? null, pendingEmail: data.user.new_email ?? null };
}

/**
 * Asks Supabase to change the address. Nothing changes until both emailed links are opened.
 *
 * @param client - the shared Supabase client
 * @param currentEmail - the address now, so asking for the same one is caught before sending
 * @param newEmail - the address the person typed
 * @returns 'sent', or the reason it was refused
 * @throws Error for any other failure (a broken connection, for example)
 */
export async function requestEmailChange(
  client: AppSupabaseClient,
  currentEmail: string | null,
  newEmail: string,
): Promise<EmailChangeOutcome> {
  // Step 1: addresses are compared without case or spaces, as Supabase stores them.
  const cleanEmail = newEmail.trim().toLowerCase();
  if (cleanEmail === (currentEmail ?? '').toLowerCase()) return 'same_address';
  // Step 2: ask Auth; it sends the two links.
  const { error } = await client.auth.updateUser({ email: cleanEmail });
  if (error === null) return 'sent';
  // Step 3: name the refusals people can fix themselves.
  const code = error.code ?? '';
  if (invalidCodes.has(code)) return 'invalid_address';
  if (inUseCodes.has(code)) return 'address_in_use';
  if (rateLimitCodes.has(code)) return 'too_many_attempts';
  throw new Error(`Could not change the email address: ${code || 'unknown error'}`);
}

/** What opening one of the two change links answers. */
export type EmailChangeConfirmation = 'changed' | 'open_the_other_link' | 'link_not_working';

/**
 * Opens one of the two links an email change sends (/auth/confirm?token_hash=…&type=email_change).
 * With double_confirm_changes on, the first link only records itself; the second one makes the
 * change.
 *
 * @param client - the shared Supabase client
 * @param tokenHash - the token from the link
 * @returns 'changed' once both links are open, 'open_the_other_link' after the first, and
 *   'link_not_working' when the link expired or was already used
 */
export async function confirmEmailChange(
  client: AppSupabaseClient,
  tokenHash: string,
): Promise<EmailChangeConfirmation> {
  // Step 1: hand the token to Auth.
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email_change',
  });
  if (error !== null) return 'link_not_working';
  // Step 2: after the first link Auth answers without an account, or with the new address still
  // waiting; after the second the new address is the account's address.
  if (data.user === null || (data.user.new_email ?? '') !== '') return 'open_the_other_link';
  return 'changed';
}
