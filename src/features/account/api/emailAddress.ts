/**
 * The signed-in person's own email address: reading it and asking to change it (story S1-E2-05,
 * added 25 Oct 2026: "every user, minors included, can see their own email in Settings and change
 * it whenever they want"; Robert).
 *
 * The address lives only in Supabase Auth, never in our tables, and only the account's owner
 * reads it here: Auth answers with the signed-in person's own record. Other people never see it
 * (the public profile carries the handle and pen name only, architecture 1.6). Nothing here logs
 * the address (CLAUDE.md rule 12).
 * Who calls it: hooks/useMyEmail.ts and hooks/useEmailChangeCodes.ts.
 * What it calls: Supabase Auth's getUser(), updateUser() and verifyOtp(). With
 * double_confirm_changes on (supabase/config.toml) Supabase emails a 6-digit code to the old and
 * the new address (supabase/templates/email_change.html), and the person types both into
 * Settings (Robert, 25 Oct 2026, 09:15).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The person's address now, and the new one waiting for its two codes. */
export interface MyEmail {
  email: string | null;
  /** Set while a change waits for both codes; null otherwise. */
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
 * Asks Supabase to change the address. Nothing changes until both emailed codes are typed in.
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
  // Step 2: ask Auth; it sends the two codes.
  const { error } = await client.auth.updateUser({ email: cleanEmail });
  if (error === null) return 'sent';
  // Step 3: name the refusals people can fix themselves.
  const code = error.code ?? '';
  if (invalidCodes.has(code)) return 'invalid_address';
  if (inUseCodes.has(code)) return 'address_in_use';
  if (rateLimitCodes.has(code)) return 'too_many_attempts';
  throw new Error(`Could not change the email address: ${code || 'unknown error'}`);
}

/** What checking one of the two emailed codes answers. */
export type EmailCodeCheck = 'confirmed' | 'wrong_code';

/**
 * Checks one of the two 6-digit codes an email change sends (Robert, 25 Oct 2026, 09:15: codes
 * typed into Settings instead of links). Supabase Auth made the code, keeps it for an hour and
 * accepts it once; we never make or store one. With double_confirm_changes on, the address
 * changes once both codes are right, in either order.
 *
 * @param client - the shared Supabase client
 * @param address - the address the code was sent to (the current one or the new one)
 * @param code - the code the person typed
 * @returns 'confirmed', or 'wrong_code' when it is wrong, used or expired
 * @throws Error when Supabase Auth can't be reached
 */
export async function checkEmailChangeCode(
  client: AppSupabaseClient,
  address: string,
  code: string,
): Promise<EmailCodeCheck> {
  // Step 1: only the digits count, so "123 456" and a pasted code with spaces both work.
  const digits = code.replace(/\D/g, '');
  if (digits.length !== 6) return 'wrong_code';
  // Step 2: hand the code to Auth; it knows which address it belongs to.
  const { error } = await client.auth.verifyOtp({
    email: address.trim().toLowerCase(),
    token: digits,
    type: 'email_change',
  });
  if (error === null) return 'confirmed';
  // Step 3: a refusal the person can fix (a wrong or old code) versus a broken connection.
  if (error.status !== undefined && error.status >= 400 && error.status < 500) return 'wrong_code';
  throw new Error(`Could not check the code: ${error.code ?? 'unknown error'}`);
}
